import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  AudioNode,
  ConvolverNode,
  GainNode,
} from 'react-native-audio-api';
import { DELAY_ENABLED } from '../constants/audioParams';
import { createDelayImpulseResponse } from '../utils/delayImpulse';
import { getSampleBuffer, makeSampleKey, type SampleVariant } from '../audio/sampleMap';

type BufferSourceNode = AudioNode & {
  buffer: any;
  loop: boolean;
  connect: (destinationNode: AudioNode) => AudioNode;
  start: (when?: number) => void;
  stop: (when?: number) => void;
  onended: null | (() => void);
};

type ButtonKind = 'siren' | 'tone';
type ButtonPhase = 'idle' | 'intro' | 'loop' | 'ending';

interface ButtonPlaybackState {
  phase: ButtonPhase;
  isHeld: boolean;
  pendingEnd: boolean;
  introSource: BufferSourceNode | null;
  loopSource: BufferSourceNode | null;
  endSource: BufferSourceNode | null;
}

const BUTTON_VARIANTS: Record<
  ButtonKind,
  { intro: SampleVariant; loop: SampleVariant; end: SampleVariant }
> = {
  siren: {
    intro: 'siren_intro',
    loop: 'siren_loop',
    end: 'siren_end',
  },
  tone: {
    intro: 'tone_intro',
    loop: 'tone_loop',
    end: 'tone_end',
  },
};

function stopSource(node: BufferSourceNode | null) {
  if (!node) return;
  try {
    node.stop();
    node.disconnect();
  } catch {
    // ignore
  }
}

function makeInitialButtonState(): ButtonPlaybackState {
  return {
    phase: 'idle',
    isHeld: false,
    pendingEnd: false,
    introSource: null,
    loopSource: null,
    endSource: null,
  };
}

function createBufferSource(ctx: AudioContext): BufferSourceNode {
  return ctx.createBufferSource() as unknown as BufferSourceNode;
}

export interface DubSirenParams {
  pitch: number; // 0-3
  mode: number; // 0-3
  beat: number; // 0-3 (0 = OFF)
  volume: number; // 0-1
}

export interface UseDubSirenReturn {
  params: DubSirenParams;
  setParams: (params: Partial<DubSirenParams>) => void;
  isPlaying: boolean;
  trigger: () => void;
  momentaryPress: () => void;
  momentaryRelease: () => void;
  sirenPress: () => void;
  sirenRelease: () => void;
  tonePress: () => void;
  toneRelease: () => void;
  resumeContext: () => Promise<void>;
}

export function useDubSiren(): UseDubSirenReturn {
  const [params, setParamsState] = useState<DubSirenParams>({
    pitch: 0,
    mode: 0,
    beat: 0,
    volume: 0.75,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const mainSourceRef = useRef<BufferSourceNode | null>(null);
  const sirenStateRef = useRef<ButtonPlaybackState>(makeInitialButtonState());
  const toneStateRef = useRef<ButtonPlaybackState>(makeInitialButtonState());
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const setParams = useCallback((updates: Partial<DubSirenParams>) => {
    setParamsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const resumeContext = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, [getAudioContext]);

  const ensureOutputChain = useCallback(
    (ctx: AudioContext): AudioNode => {
      let output = outputGainRef.current;
      let convolver = convolverRef.current;

      if (!output) {
        output = ctx.createGain();
        output.gain.value = paramsRef.current.volume;
        output.connect(ctx.destination);
        outputGainRef.current = output;
      } else {
        output.gain.value = paramsRef.current.volume;
      }

      if (DELAY_ENABLED) {
        if (!convolver) {
          convolver = ctx.createConvolver();
          convolver.buffer = createDelayImpulseResponse(ctx);
          convolver.normalize = false;
          convolver.connect(output);
          convolverRef.current = convolver;
        }
        return convolver;
      }

      if (convolver) {
        try {
          convolver.disconnect();
        } catch {
          // ignore
        }
        convolverRef.current = null;
      }

      return output;
    },
    []
  );

  const stopMainSample = useCallback(() => {
    const current = mainSourceRef.current;
    if (current) {
      stopSource(current);
    }
    mainSourceRef.current = null;
    setIsPlaying(false);
  }, []);

  const startMainSample = useCallback(
    async (currentParams: DubSirenParams) => {
      if (__DEV__) console.log('[DubSiren] startMainSample', { pitch: currentParams.pitch, mode: currentParams.mode, beat: currentParams.beat });
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (mainSourceRef.current) {
        if (__DEV__) console.log('[DubSiren] startMainSample: already playing, skip');
        return;
      }

      if (typeof (ctx as any).createBufferSource !== 'function') {
        if (__DEV__) console.warn('[DubSiren] startMainSample: createBufferSource not available');
        return;
      }

      const key = makeSampleKey(currentParams, 'main');
      const buffer = await getSampleBuffer(key);
      if (!buffer) {
        if (__DEV__) console.warn('[DubSiren] startMainSample: no buffer for key', key);
        return;
      }

      const chainInput = ensureOutputChain(ctx);
      const source = createBufferSource(ctx);

      source.buffer = buffer;
      source.loop = true;
      try {
        source.connect(chainInput);
        source.start();
      } catch (e) {
        if (__DEV__) console.warn('[DubSiren] startMainSample: start failed', e);
        stopSource(source);
        return;
      }

      mainSourceRef.current = source;
      setIsPlaying(true);
      if (__DEV__) console.log('[DubSiren] startMainSample: playing');
    },
    [ensureOutputChain, getAudioContext]
  );

  const startLoopForButton = useCallback(
    async (kind: ButtonKind) => {
      const currentParams = paramsRef.current;
      if (currentParams.beat !== 3 || currentParams.mode !== 0) {
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const variants = BUTTON_VARIANTS[kind];
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;

      let buffer: any = null;
      try {
        const loopKey = makeSampleKey(currentParams, variants.loop);
        buffer = await getSampleBuffer(loopKey);
      } catch (e) {
        console.warn(`${kind}: loop decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        stateRef.current = {
          ...state,
          phase: 'idle',
          loopSource: null,
        };
        return;
      }

      const loopSource = createBufferSource(ctx);
      loopSource.buffer = buffer;
      loopSource.loop = true;
      try {
        loopSource.connect(chainInput);
        loopSource.start();
      } catch (e) {
        console.warn(`${kind}: loop start failed`, e);
        stopSource(loopSource);
        stateRef.current = makeInitialButtonState();
        return;
      }

      stateRef.current = {
        ...state,
        phase: 'loop',
        loopSource,
      };
    },
    [ensureOutputChain, getAudioContext]
  );

  const startEndForButton = useCallback(
    async (kind: ButtonKind) => {
      const currentParams = paramsRef.current;
      if (currentParams.beat !== 3 || currentParams.mode !== 0) {
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const variants = BUTTON_VARIANTS[kind];
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;

      let buffer: any = null;
      try {
        const endKey = makeSampleKey(currentParams, variants.end);
        buffer = await getSampleBuffer(endKey);
      } catch (e) {
        console.warn(`${kind}: end decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        stateRef.current = makeInitialButtonState();
        return;
      }

      const endSource = createBufferSource(ctx);
      endSource.buffer = buffer;
      endSource.loop = false;
      try {
        endSource.connect(chainInput);
      } catch (e) {
        console.warn(`${kind}: end connect failed`, e);
        stopSource(endSource);
        stateRef.current = makeInitialButtonState();
        return;
      }

      stateRef.current = {
        ...state,
        phase: 'ending',
        endSource,
      };

      endSource.onended = () => {
        const currentState = stateRef.current;
        if (currentState.endSource !== endSource) {
          return;
        }
        stopSource(endSource);
        stateRef.current = makeInitialButtonState();
      };

      try {
        endSource.start();
      } catch (e) {
        console.warn(`${kind}: end start failed`, e);
        stopSource(endSource);
        stateRef.current = makeInitialButtonState();
      }
    },
    [ensureOutputChain, getAudioContext]
  );

  const beginButtonSequence = useCallback(
    async (kind: ButtonKind) => {
      const currentParams = paramsRef.current;
      if (currentParams.beat !== 3 || currentParams.mode !== 0) {
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const variants = BUTTON_VARIANTS[kind];
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;

      const existing = stateRef.current;
      stopSource(existing.introSource);
      stopSource(existing.loopSource);
      stopSource(existing.endSource);

      stateRef.current = {
        phase: 'idle',
        isHeld: true,
        pendingEnd: false,
        introSource: null,
        loopSource: null,
        endSource: null,
      };

      let buffer: any = null;
      try {
        const introKey = makeSampleKey(currentParams, variants.intro);
        buffer = await getSampleBuffer(introKey);
      } catch (e) {
        console.warn(`${kind}: intro decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        stateRef.current = makeInitialButtonState();
        return;
      }

      const introSource = createBufferSource(ctx);
      introSource.buffer = buffer;
      introSource.loop = false;
      try {
        introSource.connect(chainInput);
      } catch (e) {
        console.warn(`${kind}: intro connect failed`, e);
        stopSource(introSource);
        stateRef.current = makeInitialButtonState();
        return;
      }

      stateRef.current = {
        ...stateRef.current,
        phase: 'intro',
        introSource,
      };

      introSource.onended = () => {
        const state = stateRef.current;
        if (state.introSource !== introSource) {
          return;
        }

        stateRef.current = {
          ...state,
          introSource: null,
        };

        if (!state.isHeld || state.pendingEnd) {
          void startEndForButton(kind);
        } else {
          void startLoopForButton(kind);
        }
      };

      try {
        introSource.start();
      } catch (e) {
        console.warn(`${kind}: intro start failed`, e);
        stopSource(introSource);
        stateRef.current = makeInitialButtonState();
      }
    },
    [ensureOutputChain, getAudioContext, startEndForButton, startLoopForButton]
  );

  const releaseButtonSequence = useCallback(
    (kind: ButtonKind) => {
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;

      if (state.phase === 'idle') {
        state.isHeld = false;
        state.pendingEnd = false;
        return;
      }

      state.isHeld = false;

      if (state.phase === 'intro') {
        state.pendingEnd = true;
        return;
      }

      if (state.phase === 'loop') {
        if (state.loopSource) {
          stopSource(state.loopSource);
          state.loopSource = null;
        }
        void startEndForButton(kind);
      }
      // if ending, let it finish
    },
    [startEndForButton]
  );

  const trigger = useCallback(async () => {
    if (__DEV__) console.log('[DubSiren] trigger called');
    if (mainSourceRef.current) {
      stopMainSample();
    } else {
      await resumeContext();
      startMainSample(paramsRef.current).catch((e) => {
        if (__DEV__) console.warn('[DubSiren] trigger startMainSample failed', e);
      });
    }
  }, [resumeContext, startMainSample, stopMainSample]);

  const momentaryPress = useCallback(async () => {
    if (__DEV__) console.log('[DubSiren] momentaryPress (HOLD) called');
    await resumeContext();
    startMainSample(paramsRef.current).catch((e) => {
      if (__DEV__) console.warn('[DubSiren] momentaryPress startMainSample failed', e);
    });
  }, [resumeContext, startMainSample]);

  const momentaryRelease = useCallback(() => {
    stopMainSample();
  }, [stopMainSample]);

  useEffect(() => {
    const output = outputGainRef.current;
    if (output) {
      output.gain.value = params.volume;
    }
  }, [params.volume]);

  const sirenPress = useCallback(() => {
    void beginButtonSequence('siren');
  }, [beginButtonSequence]);

  const sirenRelease = useCallback(() => {
    releaseButtonSequence('siren');
  }, [releaseButtonSequence]);

  const tonePress = useCallback(() => {
    void beginButtonSequence('tone');
  }, [beginButtonSequence]);

  const toneRelease = useCallback(() => {
    releaseButtonSequence('tone');
  }, [releaseButtonSequence]);

  const fullCleanup = useCallback(() => {
    stopMainSample();
    const buttonRefs = [sirenStateRef, toneStateRef];
    buttonRefs.forEach((ref) => {
      const state = ref.current;
      stopSource(state.introSource);
      stopSource(state.loopSource);
      stopSource(state.endSource);
      ref.current = makeInitialButtonState();
    });
    try {
      convolverRef.current?.disconnect();
      outputGainRef.current?.disconnect();
    } catch {
      // ignore
    }
    convolverRef.current = null;
    outputGainRef.current = null;
  }, [stopMainSample]);

  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, [fullCleanup]);

  return {
    params,
    setParams,
    isPlaying,
    trigger,
    momentaryPress,
    momentaryRelease,
    sirenPress,
    sirenRelease,
    tonePress,
    toneRelease,
    resumeContext,
  };
}
