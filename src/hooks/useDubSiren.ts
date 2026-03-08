import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioContext,
  AudioManager,
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
type ButtonPhase = 'idle' | 'playing_all' | 'ending';

interface ButtonPlaybackState {
  phase: ButtonPhase;
  /**
   * Snapshot of the params at the moment the button
   * sequence begins. We use this so that BEAT/MODE/PITCH
   * changes while the _ALL sample is playing do not
   * accidentally cancel the end stage.
   */
  baseParams: DubSirenParams | null;
  isHeld: boolean;
  allSource: BufferSourceNode | null;
  endSource: BufferSourceNode | null;
  allTimeoutId: any;
  endTimeoutId: any;
  gainNode: GainNode | null;
}

/** Power LED pulse period (ms) per beat index (0–3): beat 0 = 1s, 1 = 0.5s, 2 = 0.25s, 3 = 0.25s. */
const BEAT_PULSE_MS: Record<number, number> = { 0: 600, 1: 300, 2: 150, 3: 1250 };

const BUTTON_VARIANTS: Record<ButtonKind, { all: SampleVariant; end: SampleVariant }> = {
  siren: {
    all: 'siren_all',
    end: 'siren_end',
  },
  tone: {
    all: 'tone_all',
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
    allSource: null,
    endSource: null,
    allTimeoutId: null,
    endTimeoutId: null,
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
  volume: number; // 0-2 (1 = unity, 2 = 2x louder)
}

export interface UseDubSirenReturn {
  params: DubSirenParams;
  setParams: (params: Partial<DubSirenParams>) => void;
  delayParams: DelayParams;
  setDelayParams: (updater: (prev: DelayParams) => DelayParams) => void;
  isPlaying: boolean;
  beatPeriodMs: number | null;
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
    volume: 3,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [delayParams, setDelayParamsState] = useState<DelayParams>(DEFAULT_DELAY_PARAMS);

  const beatPeriodMs = useMemo(
    () => (isPlaying ? BEAT_PULSE_MS[params.beat] ?? null : null),
    [isPlaying, params.beat]
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const delayInputRef = useRef<GainNode | null>(null);
  const convolver0Ref = useRef<ConvolverNode | null>(null);
  const delayGain0Ref = useRef<GainNode | null>(null);
  const mainSourceRef = useRef<BufferSourceNode | null>(null);
  const mainAllTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    await AudioManager.setAudioSessionActivity(true);
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, [getAudioContext]);

  const resetAudioContext = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    try {
      if (typeof ctx.close === 'function' && ctx.state !== 'closed') {
        void ctx.close();
      }
    } catch {
      // ignore
    }
    audioContextRef.current = null;
    outputGainRef.current = null;
    delayInputRef.current = null;
    convolver0Ref.current = null;
    delayGain0Ref.current = null;
    mainSourceRef.current = null;
    if (mainAllTimeoutIdRef.current) {
      clearTimeout(mainAllTimeoutIdRef.current);
      mainAllTimeoutIdRef.current = null;
    }
    setIsPlaying(false);
    sirenStateRef.current = makeInitialButtonState();
    toneStateRef.current = makeInitialButtonState();
  }, []);

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
    if (mainAllTimeoutIdRef.current) {
      clearTimeout(mainAllTimeoutIdRef.current);
      mainAllTimeoutIdRef.current = null;
    }
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
      await AudioManager.setAudioSessionActivity(true);
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

      const useAll = currentParams.beat === 2 && (currentParams.mode === 0 || currentParams.mode === 3);
      const key = makeSampleKey(currentParams, useAll ? 'main_all' : 'main');
      const buffer = await getSampleBuffer(key);
      if (!buffer) {
        if (__DEV__) console.warn('[DubSiren] startMainSample: no buffer for key', key);
        return;
      }

      const chainInput = ensureOutputChain(ctx);
      const source = createBufferSource(ctx);

      source.buffer = buffer;
      source.loop = !useAll;
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

      if (useAll) {
        const durationMs = Math.ceil(buffer.duration * 1000) + 50;
        mainAllTimeoutIdRef.current = setTimeout(() => {
          if (mainSourceRef.current !== source) return;
          try {
            source.disconnect();
          } catch {
            // ignore
          }
          mainSourceRef.current = null;
          mainAllTimeoutIdRef.current = null;
          setIsPlaying(false);
        }, durationMs);
      }

      if (__DEV__) console.log('[DubSiren] startMainSample: playing', useAll ? '(main_all once)' : '');
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

      await AudioManager.setAudioSessionActivity(true);
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

      // Use duration-based timeout instead of onended - onended can fire early on iOS
      // and corrupt state. This ensures we cleanup only after the sample has fully played.
      const endDurationMs = Math.ceil(buffer.duration * 1000) + 150;
      const endTimeoutId = setTimeout(() => {
        const currentState = stateRef.current;
        if (currentState.endSource !== endSource) return;
        try {
          endSource.disconnect();
        } catch {
          // ignore
        }
        stateRef.current = makeInitialButtonState();
        if (!mainSourceRef.current) {
          resetAudioContext();
        }
      }, endDurationMs);

      stateRef.current = {
        ...stateRef.current,
        endTimeoutId,
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
    [ensureOutputChain, getAudioContext, resetAudioContext]
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

      await AudioManager.setAudioSessionActivity(true);
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const chainInput = ensureOutputChain(ctx);
      const variants = BUTTON_VARIANTS[kind];
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const gain = getOrCreateButtonGain(ctx, chainInput, kind);

      const existing = stateRef.current;
      stopSource(existing.allSource);
      stopSource(existing.endSource);
      if (existing.allTimeoutId) {
        clearTimeout(existing.allTimeoutId);
      }
      if (existing.endTimeoutId) {
        clearTimeout(existing.endTimeoutId);
      }

      stateRef.current = {
        phase: 'idle',
        baseParams: currentParams,
        isHeld: true,
        allSource: null,
        endSource: null,
        allTimeoutId: null,
        endTimeoutId: null,
        gainNode: gain,
      };

      let buffer: any = null;
      try {
        const allKey = makeSampleKey(currentParams, variants.all);
        if (__DEV__) {
          console.log('[DubSiren] beginButtonSequence: loading _ALL buffer', {
            kind,
            allKey,
          });
        }
        buffer = await getSampleBuffer(allKey);
      } catch (e) {
        console.warn(`${kind}: _ALL decode failed`, e);
        buffer = null;
      }
      if (!buffer) {
        if (__DEV__) {
          console.warn(
            `[DubSiren] beginButtonSequence(${kind}): no buffer for _ALL, resetting button state`
          );
        }
        stateRef.current = makeInitialButtonState();
        return;
      }

      const allSource = createBufferSource(ctx);
      allSource.buffer = buffer;
      allSource.loop = false;
      try {
        allSource.connect(gain);
      } catch (e) {
        console.warn(`${kind}: _ALL connect failed`, e);
        stopSource(allSource);
        stateRef.current = makeInitialButtonState();
        return;
      }

      const allDurationMs = Math.ceil(buffer.duration * 1000) + 50;
      const timeoutId = setTimeout(() => {
        const state = stateRef.current;
        if (state.allSource !== allSource || state.phase !== 'playing_all') {
          if (__DEV__) {
            console.log(
              `[DubSiren] _ALL timeout for ${kind}: state changed (phase=${state.phase}), ignoring`
            );
          }
          return;
        }

        stateRef.current = {
          ...state,
          phase: 'idle',
          allSource: null,
          allTimeoutId: null,
        };
        if (__DEV__) {
          console.log(`[DubSiren] _ALL finished for ${kind}, resetting to idle`);
        }
      }, allDurationMs);

      stateRef.current = {
        ...stateRef.current,
        phase: 'playing_all',
        allSource,
        allTimeoutId: timeoutId,
      };

      try {
        allSource.start();
        applyFadeIn(ctx, gain);
        if (__DEV__) {
          console.log('[DubSiren] beginButtonSequence: _ALL started', {
            kind,
          });
        }
      } catch (e) {
        console.warn(`${kind}: _ALL start failed`, e);
        stopSource(allSource);
        stateRef.current = makeInitialButtonState();
      }
    },
    [ensureOutputChain, getAudioContext]
  );

  const releaseButtonSequence = useCallback(
    (kind: ButtonKind) => {
      const stateRef = kind === 'siren' ? sirenStateRef : toneStateRef;
      const state = stateRef.current;

      if (state.phase === 'idle') {
        state.baseParams = null;
        state.isHeld = false;
        return;
      }

      state.isHeld = false;

      if (state.phase === 'playing_all') {
        if (state.allSource) {
          stopSource(state.allSource);
          state.allSource = null;
        }
        if (state.allTimeoutId) {
          clearTimeout(state.allTimeoutId);
          state.allTimeoutId = null;
        }
        if (__DEV__) {
          console.log(
            `[DubSiren] releaseButtonSequence(${kind}): released during _ALL, starting END`
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
      if (state.allTimeoutId) {
        clearTimeout(state.allTimeoutId);
      }
      if (state.endTimeoutId) {
        clearTimeout(state.endTimeoutId);
      }
      stopSource(state.allSource);
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
    beatPeriodMs,
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
