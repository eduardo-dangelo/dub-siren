import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  AudioNode,
  BiquadFilterNode,
  ConstantSourceNode,
  ConvolverNode,
  GainNode,
  OscillatorNode,
} from 'react-native-audio-api';
import {
  BEAT_RATES,
  DELAY_ENABLED,
  LFO_MODULATION_DEPTH,
  LFO_SMOOTH_CUTOFF,
  LOWPASS_CUTOFF,
  MAIN_OSC_WAVEFORM,
  MODE_WAVEFORMS,
  OscillatorType,
  PITCH_FREQUENCIES,
  RELEASE_MS,
  SATURATION_AMOUNT,
  SATURATION_DRIVE_POST,
  SATURATION_DRIVE_PRE,
  SATURATION_ENABLED,
  SMOOTH_LFO,
} from '../constants/audioParams';
import { createDelayImpulseResponse } from '../utils/delayImpulse';
import { makeSoftClipCurve } from '../utils/saturationCurve';

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
    pitch: 1,
    mode: 1,
    beat: 1,
    volume: 0.75,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mainOscRef = useRef<OscillatorNode | null>(null);
  const lfoOscRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const manualGainRef = useRef<GainNode | null>(null);
  const constantSourceRef = useRef<ConstantSourceNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const saturationPreGainRef = useRef<GainNode | null>(null);
  const waveShaperRef = useRef<AudioNode | null>(null);
  const saturationPostGainRef = useRef<GainNode | null>(null);
  const voiceChainInputRef = useRef<AudioNode | null>(null);
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, []);

  /** Cleanup after release envelope completes */
  const doStopCleanup = useCallback(() => {
    try {
      if (lfoGainRef.current) {
        lfoGainRef.current.disconnect();
      }
      if (manualGainRef.current && mainOscRef.current) {
        manualGainRef.current.disconnect(mainOscRef.current.frequency);
      }
      constantSourceRef.current?.disconnect();
      mainOscRef.current?.disconnect();
      lfoOscRef.current?.disconnect();
      voiceGainRef.current?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    mainOscRef.current = null;
    lfoOscRef.current = null;
    lfoGainRef.current = null;
    manualGainRef.current = null;
    constantSourceRef.current = null;
    voiceGainRef.current = null;
    releaseTimeoutRef.current = null;
    setIsPlaying(false);
  }, []);

  /** Soft stop: fade out via release envelope, then stop oscillators */
  const stopOscillators = useCallback(() => {
    const ctx = audioContextRef.current;
    const voiceGain = voiceGainRef.current;
    const mainOsc = mainOscRef.current;
    const lfoOsc = lfoOscRef.current;
    const constantSource = constantSourceRef.current;

    if (!ctx || !voiceGain || !mainOsc || !lfoOsc || !constantSource) {
      doStopCleanup();
      return;
    }

    const stopTime = ctx.currentTime + RELEASE_MS / 1000;

    voiceGain.gain.cancelScheduledValues(ctx.currentTime);
    voiceGain.gain.setValueAtTime(voiceGain.gain.value, ctx.currentTime);
    voiceGain.gain.linearRampToValueAtTime(0, stopTime);

    mainOsc.stop(stopTime);
    lfoOsc.stop(stopTime);
    constantSource.stop(stopTime);

    releaseTimeoutRef.current = setTimeout(() => {
      doStopCleanup();
    }, RELEASE_MS + 20);
  }, [doStopCleanup]);

  /** Full cleanup: disconnect everything (for unmount) */
  const fullCleanup = useCallback(() => {
    if (releaseTimeoutRef.current) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
    try {
      if (lfoGainRef.current) {
        lfoGainRef.current.disconnect();
      }
      if (manualGainRef.current && mainOscRef.current) {
        manualGainRef.current.disconnect(mainOscRef.current.frequency);
      }
      constantSourceRef.current?.disconnect();
      constantSourceRef.current?.stop();
      mainOscRef.current?.disconnect();
      lfoOscRef.current?.disconnect();
      mainOscRef.current?.stop();
      lfoOscRef.current?.stop();
      voiceGainRef.current?.disconnect();
      saturationPostGainRef.current?.disconnect();
      convolverRef.current?.disconnect();
      outputGainRef.current?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    mainOscRef.current = null;
    lfoOscRef.current = null;
    lfoGainRef.current = null;
    outputGainRef.current = null;
    filterRef.current = null;
    manualGainRef.current = null;
    constantSourceRef.current = null;
    voiceGainRef.current = null;
    saturationPreGainRef.current = null;
    waveShaperRef.current = null;
    saturationPostGainRef.current = null;
    voiceChainInputRef.current = null;
    convolverRef.current = null;
    setIsPlaying(false);
  }, []);

  const startOscillators = useCallback(
    (currentParams: DubSirenParams) => {
      const ctx = getAudioContext();
      if (mainOscRef.current) return;

      const baseFreq = PITCH_FREQUENCIES[currentParams.pitch];
      const waveform = MODE_WAVEFORMS[currentParams.mode] as OscillatorType;
      const beatOff = currentParams.beat === 0;

      let filter = filterRef.current;
      let outputGain = outputGainRef.current;

      if (!filter) {
        outputGain = ctx.createGain();
        outputGain.gain.value = currentParams.volume;
        outputGain.connect(ctx.destination);

        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = LOWPASS_CUTOFF;

        // When createWaveShaper is unavailable (e.g. react-native-audio-api on native), saturation is skipped.
        const hasWaveShaper =
          SATURATION_ENABLED &&
          typeof (ctx as { createWaveShaper?: () => AudioNode }).createWaveShaper === 'function';

        let voiceChainInput: AudioNode = filter;
        if (hasWaveShaper) {
          const preGain = ctx.createGain();
          const waveShaper = (ctx as { createWaveShaper(): AudioNode & { curve: Float32Array | null; oversample?: string } }).createWaveShaper();
          const postGain = ctx.createGain();
          preGain.gain.value = SATURATION_DRIVE_PRE;
          postGain.gain.value = SATURATION_DRIVE_POST;
          waveShaper.curve = makeSoftClipCurve(SATURATION_AMOUNT);
          if ('oversample' in waveShaper && waveShaper.oversample !== undefined) {
            waveShaper.oversample = '2x';
          }
          preGain.connect(waveShaper);
          waveShaper.connect(postGain);
          postGain.connect(filter);
          voiceChainInput = preGain;
          saturationPreGainRef.current = preGain;
          waveShaperRef.current = waveShaper;
          saturationPostGainRef.current = postGain;
        }

        if (DELAY_ENABLED) {
          const convolver = ctx.createConvolver();
          convolver.buffer = createDelayImpulseResponse(ctx);
          convolver.normalize = false;
          filter.connect(convolver);
          convolver.connect(outputGain);
          convolverRef.current = convolver;
        } else {
          filter.connect(outputGain);
        }

        filterRef.current = filter;
        outputGainRef.current = outputGain;
        voiceChainInputRef.current = voiceChainInput;
      } else {
        outputGain!.gain.value = currentParams.volume;
        voiceChainInputRef.current = filter;
      }

      const mainOsc = ctx.createOscillator();
      const lfoOsc = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const manualGain = ctx.createGain();
      const constantSource = ctx.createConstantSource();

      mainOsc.type = MAIN_OSC_WAVEFORM;
      mainOsc.frequency.value = baseFreq;
      lfoOsc.type = waveform;
      lfoOsc.frequency.value = beatOff ? 0 : BEAT_RATES[currentParams.beat - 1];
      lfoGain.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
      constantSource.offset.value = 1;
      constantSource.connect(manualGain);
      manualGain.gain.value = 0;
      manualGain.connect(mainOsc.frequency);
      lfoOsc.connect(lfoGain);
      if (SMOOTH_LFO && !beatOff) {
        const lfoSmooth = ctx.createBiquadFilter();
        lfoSmooth.type = 'lowpass';
        lfoSmooth.frequency.value = LFO_SMOOTH_CUTOFF;
        lfoGain.connect(lfoSmooth);
        lfoSmooth.connect(mainOsc.frequency);
      } else {
        lfoGain.connect(mainOsc.frequency);
      }

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1;
      mainOsc.connect(voiceGain);
      const chainInput = voiceChainInputRef.current ?? filter;
      voiceGain.connect(chainInput);

      voiceGainRef.current = voiceGain;

      const t = ctx.currentTime + 0.01;
      mainOsc.start(t);
      lfoOsc.start();
      constantSource.start();

      mainOscRef.current = mainOsc;
      lfoOscRef.current = lfoOsc;
      lfoGainRef.current = lfoGain;
      manualGainRef.current = manualGain;
      constantSourceRef.current = constantSource;
      setIsPlaying(true);
    },
    [getAudioContext]
  );

  const trigger = useCallback(async () => {
    if (isPlaying) {
      stopOscillators();
    } else {
      await resumeContext();
      startOscillators(paramsRef.current);
    }
  }, [isPlaying, resumeContext, startOscillators, stopOscillators]);

  const momentaryPress = useCallback(async () => {
    await resumeContext();
    startOscillators(paramsRef.current);
  }, [resumeContext, startOscillators]);

  const momentaryRelease = useCallback(() => {
    stopOscillators();
  }, [stopOscillators]);

  useEffect(() => {
    if (!isPlaying) return;
    const mainOsc = mainOscRef.current;
    const lfoOsc = lfoOscRef.current;
    const lfoGain = lfoGainRef.current;
    const outputGain = outputGainRef.current;
    if (!mainOsc || !lfoOsc || !lfoGain || !outputGain) return;

    const baseFreq = PITCH_FREQUENCIES[params.pitch];
    const waveform = MODE_WAVEFORMS[params.mode] as OscillatorType;
    const beatOff = params.beat === 0;

    mainOsc.frequency.setValueAtTime(baseFreq, 0);
    lfoOsc.type = waveform;
    lfoOsc.frequency.value = beatOff ? 0 : BEAT_RATES[params.beat - 1];
    lfoGain.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
    outputGain.gain.value = params.volume;
  }, [params, isPlaying]);

  const sirenPress = useCallback(() => {
    if (!isPlaying || params.beat !== 0) return;
    const manualGain = manualGainRef.current;
    if (!manualGain) return;
    manualGain.gain.setValueAtTime(LFO_MODULATION_DEPTH, 0);
  }, [isPlaying, params.beat]);

  const sirenRelease = useCallback(() => {
    const manualGain = manualGainRef.current;
    if (!manualGain) return;
    manualGain.gain.setValueAtTime(0, 0);
  }, []);

  const tonePress = useCallback(() => {
    if (!isPlaying || params.beat !== 0) return;
    const manualGain = manualGainRef.current;
    if (!manualGain) return;
    manualGain.gain.setValueAtTime(-LFO_MODULATION_DEPTH, 0);
  }, [isPlaying, params.beat]);

  const toneRelease = useCallback(() => {
    const manualGain = manualGainRef.current;
    if (!manualGain) return;
    manualGain.gain.setValueAtTime(0, 0);
  }, []);

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
