import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  AudioNode,
  ConvolverNode,
  GainNode,
} from 'react-native-audio-api';
import { DEFAULT_DELAY_PARAMS, type DelayParams } from '../constants/audioParams';
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
  /**
   * Snapshot of the params at the moment the button
   * sequence begins. We use this so that BEAT/MODE/PITCH
   * changes while the intro sample is playing do not
   * accidentally cancel the loop/end stages.
   */
  baseParams: DubSirenParams | null;
  isHeld: boolean;
  pendingEnd: boolean;
  introSource: BufferSourceNode | null;
  loopSource: BufferSourceNode | null;
  endSource: BufferSourceNode | null;
  introTimeoutId: any;
  gainNode: GainNode | null;
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
    baseParams: null,
    isHeld: false,
    pendingEnd: false,
    introSource: null,
    loopSource: null,
    endSource: null,
    introTimeoutId: null,
    gainNode: null,
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
  delayParams: DelayParams;
  setDelayParams: (updater: (prev: DelayParams) => DelayParams) => void;
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
  const [delayParams, setDelayParamsState] = useState<DelayParams>(DEFAULT_DELAY_PARAMS);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const delayInputRef = useRef<GainNode | null>(null);
  const convolver0Ref = useRef<ConvolverNode | null>(null);
  const delayGain0Ref = useRef<GainNode | null>(null);
  const mainSourceRef = useRef<BufferSourceNode | null>(null);
  const sirenStateRef = useRef<ButtonPlaybackState>(makeInitialButtonState());
  const toneStateRef = useRef<ButtonPlaybackState>(makeInitialButtonState());
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const delayParamsRef = useRef(delayParams);
  delayParamsRef.current = delayParams;

  const setParams = useCallback((updates: Partial<DubSirenParams>) => {
    setParamsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setDelayParams = useCallback((updater: (prev: DelayParams) => DelayParams) => {
    setDelayParamsState(updater);
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

  const applyFadeIn = useCallback((ctx: AudioContext, gain: GainNode) => {
    const FADE_TIME = 0; // 10ms
    try {
      const param: any = (gain as any).gain;
      const now = (ctx as any).currentTime ?? 0;
      if (
        param &&
        typeof param.setValueAtTime === 'function' &&
        typeof param.linearRampToValueAtTime === 'function'
      ) {
        param.cancelScheduledValues(now);
        param.setValueAtTime(0, now);
        param.linearRampToValueAtTime(1, now + FADE_TIME);
      } else {
        // Fallback: just set to 1 without a ramp
        param.value = 1;
      }
    } catch {
      // ignore – if scheduling fails, we still let audio play
    }
  }, []);

  const getOrCreateButtonGain = useCallback(
    (ctx: AudioContext, chainInput: AudioNode, kind: ButtonKind): GainNode => {
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;
      if (state.gainNode) {
        return state.gainNode;
      }
      const gain = ctx.createGain();
      // Default to full volume; specific starts can apply a fade-in.
      gain.gain.value = 1;
      try {
        gain.connect(chainInput);
      } catch {
        // ignore connect problems; if this fails, behavior falls back to direct-connect
      }
      stateRef.current = {
        ...state,
        gainNode: gain,
      };
      return gain;
    },
    []
  );

  const ensureOutputChain = useCallback(
    (ctx: AudioContext): AudioNode => {
      let output = outputGainRef.current;

      if (!output) {
        output = ctx.createGain();
        output.gain.value = paramsRef.current.volume;
        output.connect(ctx.destination);
        outputGainRef.current = output;
      } else {
        output.gain.value = paramsRef.current.volume;
      }

      if (delayParamsRef.current.enabled) {
        let delayInput = delayInputRef.current;
        if (!delayInput) {
          delayInput = ctx.createGain();
          delayInput.gain.value = 1;
          delayInputRef.current = delayInput;
        }

        let conv0 = convolver0Ref.current;
        let gain0 = delayGain0Ref.current;
        if (!conv0 || !gain0) {
          conv0 = ctx.createConvolver();
          conv0.buffer = createDelayImpulseResponse(ctx, delayParamsRef.current);
          conv0.normalize = false;
          gain0 = ctx.createGain();
          gain0.gain.value = 1;
          delayInput.connect(conv0);
          conv0.connect(gain0);
          gain0.connect(output);
          convolver0Ref.current = conv0;
          delayGain0Ref.current = gain0;
        }

        return delayInput;
      }

      // Delay disabled: disconnect and clear delay chain
      const toDisconnect = [
        delayInputRef.current,
        convolver0Ref.current,
        delayGain0Ref.current,
      ];
      toDisconnect.forEach((node) => {
        if (node) {
          try {
            node.disconnect();
          } catch {
            // ignore
          }
        }
      });
      delayInputRef.current = null;
      convolver0Ref.current = null;
      delayGain0Ref.current = null;

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
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;
      const params = state.baseParams ?? paramsRef.current;

      if (params.beat !== 3 || params.mode !== 0) {
        if (__DEV__) {
          console.log(
            `[DubSiren] startLoopForButton(${kind}): params no longer match BEAT_4/MODE_1, skipping loop`,
            params
          );
        }
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const gain = getOrCreateButtonGain(ctx, chainInput, kind);
      const variants = BUTTON_VARIANTS[kind];

      let buffer: any = null;
      try {
        const loopKey = makeSampleKey(params, variants.loop);
        if (__DEV__) {
          console.log('[DubSiren] startLoopForButton: loading buffer', {
            kind,
            loopKey,
          });
        }
        buffer = await getSampleBuffer(loopKey);
      } catch (e) {
        console.warn(`${kind}: loop decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        if (__DEV__) {
          console.warn(
            `[DubSiren] startLoopForButton(${kind}): no buffer for loop, resetting button state`
          );
        }
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
        loopSource.connect(gain);
        loopSource.start();
        applyFadeIn(ctx, gain);
        if (__DEV__) {
          console.log('[DubSiren] startLoopForButton: loop started', {
            kind,
          });
        }
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
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;
      const params = state.baseParams ?? paramsRef.current;

      if (params.beat !== 3 || params.mode !== 0) {
        if (__DEV__) {
          console.log(
            `[DubSiren] startEndForButton(${kind}): params no longer match BEAT_4/MODE_1, skipping end`,
            params
          );
        }
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const gain = getOrCreateButtonGain(ctx, chainInput, kind);
      const variants = BUTTON_VARIANTS[kind];

      let buffer: any = null;
      try {
        const endKey = makeSampleKey(params, variants.end);
        if (__DEV__) {
          console.log('[DubSiren] startEndForButton: loading buffer', {
            kind,
            endKey,
          });
        }
        buffer = await getSampleBuffer(endKey);
      } catch (e) {
        console.warn(`${kind}: end decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        if (__DEV__) {
          console.warn(
            `[DubSiren] startEndForButton(${kind}): no buffer for end, resetting button state`
          );
        }
        stateRef.current = makeInitialButtonState();
        return;
      }

      const endSource = createBufferSource(ctx);
      endSource.buffer = buffer;
      endSource.loop = false;
      try {
        endSource.connect(gain);
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
        applyFadeIn(ctx, gain);
        if (__DEV__) {
          console.log('[DubSiren] startEndForButton: end started', {
            kind,
          });
        }
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
        if (__DEV__) {
          console.log(
            `[DubSiren] beginButtonSequence(${kind}): ignoring press because params are not BEAT_4/MODE_1`,
            currentParams
          );
        }
        return;
      }

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const variants = BUTTON_VARIANTS[kind];
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const gain = getOrCreateButtonGain(ctx, chainInput, kind);

      const existing = stateRef.current;
      stopSource(existing.introSource);
      stopSource(existing.loopSource);
      stopSource(existing.endSource);
      if (existing.introTimeoutId) {
        clearTimeout(existing.introTimeoutId);
      }

      stateRef.current = {
        phase: 'idle',
        baseParams: currentParams,
        isHeld: true,
        pendingEnd: false,
        introSource: null,
        loopSource: null,
        endSource: null,
        introTimeoutId: null,
        gainNode: gain,
      };

      let buffer: any = null;
      try {
        const introKey = makeSampleKey(currentParams, variants.intro);
        if (__DEV__) {
          console.log('[DubSiren] beginButtonSequence: loading intro buffer', {
            kind,
            introKey,
          });
        }
        buffer = await getSampleBuffer(introKey);
      } catch (e) {
        console.warn(`${kind}: intro decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        if (__DEV__) {
          console.warn(
            `[DubSiren] beginButtonSequence(${kind}): no buffer for intro, resetting button state`
          );
        }
        stateRef.current = makeInitialButtonState();
        return;
      }

      const introSource = createBufferSource(ctx);
      introSource.buffer = buffer;
      introSource.loop = false;
      try {
        introSource.connect(gain);
      } catch (e) {
        console.warn(`${kind}: intro connect failed`, e);
        stopSource(introSource);
        stateRef.current = makeInitialButtonState();
        return;
      }

      const introDurationMs = buffer.duration * 1000;
      const timeoutId = setTimeout(() => {
        const state = stateRef.current;
        if (state.introSource !== introSource || state.phase !== 'intro') {
          if (__DEV__) {
            console.log(
              `[DubSiren] intro timeout for ${kind}: state changed (phase=${state.phase}), ignoring`
            );
          }
          return;
        }

        stateRef.current = {
          ...state,
          introSource: null,
          introTimeoutId: null,
        };

        if (!state.isHeld || state.pendingEnd) {
          if (__DEV__) {
            console.log(
              `[DubSiren] intro timeout for ${kind}: button not held or pendingEnd, starting END`
            );
          }
          void startEndForButton(kind);
        } else {
          if (__DEV__) {
            console.log(
              `[DubSiren] intro timeout for ${kind}: button still held, starting LOOP`
            );
          }
          void startLoopForButton(kind);
        }
      }, introDurationMs);

      stateRef.current = {
        ...stateRef.current,
        phase: 'intro',
        introSource,
        introTimeoutId: timeoutId,
      };

      try {
        introSource.start();
        applyFadeIn(ctx, gain);
        if (__DEV__) {
          console.log('[DubSiren] beginButtonSequence: intro started', {
            kind,
          });
        }
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
        state.baseParams = null;
        state.isHeld = false;
        state.pendingEnd = false;
        return;
      }

      state.isHeld = false;

      if (state.phase === 'intro') {
        state.pendingEnd = true;
        if (__DEV__) {
          console.log(
            `[DubSiren] releaseButtonSequence(${kind}): released during INTRO, will play END after intro`
          );
        }
        return;
      }

      if (state.phase === 'loop') {
        if (state.loopSource) {
          stopSource(state.loopSource);
          state.loopSource = null;
        }
        if (__DEV__) {
          console.log(
            `[DubSiren] releaseButtonSequence(${kind}): released during LOOP, starting END`
          );
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

  // Restart main sample when pitch/mode/beat change during playback
  useEffect(() => {
    if (!mainSourceRef.current) return;
    stopMainSample();
    startMainSample(paramsRef.current).catch((e) => {
      if (__DEV__) console.warn('[DubSiren] param-change restart failed', e);
    });
  }, [params.pitch, params.mode, params.beat, stopMainSample, startMainSample]);

  // React to delay param changes: swap single convolver in place, or reconnect chain when toggled
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const output = outputGainRef.current;
    const delayInput = delayInputRef.current;
    const conv0 = convolver0Ref.current;
    const gain0 = delayGain0Ref.current;

    // Delay disabled and no delay chain: already correct, nothing to do
    if (!delayParams.enabled && !delayInput) {
      return;
    }

    // Delay enabled with existing chain: swap convolver with new params (single path only)
    if (delayParams.enabled && delayInput && conv0 && gain0 && output) {
      try {
        const newConv = ctx.createConvolver();
        newConv.buffer = createDelayImpulseResponse(ctx, delayParams);
        newConv.normalize = false;
        // Disconnect old path first to avoid any parallel summing
        conv0.disconnect();
        try {
          delayInput.disconnect(conv0);
        } catch {
          // ignore if disconnect(dest) not supported
        }
        // Connect new path
        delayInput.connect(newConv);
        newConv.connect(gain0);
        convolver0Ref.current = newConv;
      } catch {
        // ignore
      }
      return;
    }

    // Chain structure changed: ensure correct chain, then reconnect all active sources
    const newChainInput = ensureOutputChain(ctx);

    const mainSource = mainSourceRef.current;
    if (mainSource) {
      try {
        mainSource.disconnect();
        mainSource.connect(newChainInput);
      } catch {
        // ignore
      }
    }

    for (const stateRef of [sirenStateRef, toneStateRef]) {
      const gain = stateRef.current.gainNode;
      if (gain) {
        try {
          gain.disconnect();
          gain.connect(newChainInput);
        } catch {
          // ignore
        }
      }
    }
  }, [delayParams, ensureOutputChain]);

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
      if (state.introTimeoutId) {
        clearTimeout(state.introTimeoutId);
      }
      stopSource(state.introSource);
      stopSource(state.loopSource);
      stopSource(state.endSource);
      if (state.gainNode) {
        try {
          state.gainNode.disconnect();
        } catch {
          // ignore
        }
      }
      ref.current = makeInitialButtonState();
    });
    const toDisconnect = [
      delayInputRef.current,
      convolver0Ref.current,
      delayGain0Ref.current,
      outputGainRef.current,
    ];
    toDisconnect.forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
    });
    delayInputRef.current = null;
    convolver0Ref.current = null;
    delayGain0Ref.current = null;
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
    delayParams,
    setDelayParams,
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
