import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  BiquadFilterNode,
  ConstantSourceNode,
  ConvolverNode,
  GainNode,
  OscillatorNode,
} from 'react-native-audio-api';
import {
  BEAT_RATES,
  LFO_MODULATION_DEPTH,
  LOWPASS_CUTOFF,
  MODE_WAVEFORMS,
  OscillatorType,
  PITCH_FREQUENCIES,
} from '../constants/audioParams';
import { createDelayImpulseResponse } from '../utils/delayImpulse';

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

  /** Soft stop: stop oscillators only, keep effect chain for delay tail */
  const stopOscillators = useCallback(() => {
    try {
      if (lfoGainRef.current && mainOscRef.current) {
        lfoGainRef.current.disconnect(mainOscRef.current.frequency);
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
    } catch {
      // Ignore disconnect errors
    }
    mainOscRef.current = null;
    lfoOscRef.current = null;
    lfoGainRef.current = null;
    manualGainRef.current = null;
    constantSourceRef.current = null;
    setIsPlaying(false);
  }, []);

  /** Full cleanup: disconnect everything (for unmount) */
  const fullCleanup = useCallback(() => {
    try {
      if (lfoGainRef.current && mainOscRef.current) {
        lfoGainRef.current.disconnect(mainOscRef.current.frequency);
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

        const convolver = ctx.createConvolver();
        convolver.buffer = createDelayImpulseResponse(ctx);
        convolver.normalize = false;
        filter.connect(convolver);
        convolver.connect(outputGain);

        filterRef.current = filter;
        convolverRef.current = convolver;
        outputGainRef.current = outputGain;
      } else {
        outputGain!.gain.value = currentParams.volume;
      }

      const mainOsc = ctx.createOscillator();
      const lfoOsc = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const manualGain = ctx.createGain();
      const constantSource = ctx.createConstantSource();

      mainOsc.type = 'square';
      mainOsc.frequency.value = baseFreq;
      lfoOsc.type = waveform;
      lfoOsc.frequency.value = beatOff ? 0 : BEAT_RATES[currentParams.beat - 1];
      lfoGain.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
      constantSource.offset.value = 1;
      constantSource.connect(manualGain);
      manualGain.gain.value = 0;
      manualGain.connect(mainOsc.frequency);
      lfoOsc.connect(lfoGain);
      lfoGain.connect(mainOsc.frequency);
      mainOsc.connect(filter);

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
