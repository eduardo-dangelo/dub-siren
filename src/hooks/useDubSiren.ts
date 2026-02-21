import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  BiquadFilterNode,
  ConstantSourceNode,
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
    mode: 2, // square default
    beat: 2,
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

  const startOscillators = useCallback(
    (currentParams: DubSirenParams) => {
      const ctx = getAudioContext();
      if (mainOscRef.current) return;

      const baseFreq = PITCH_FREQUENCIES[currentParams.pitch];
      const waveform = MODE_WAVEFORMS[currentParams.mode] as OscillatorType;
      const beatOff = currentParams.beat === 0;

      const mainOsc = ctx.createOscillator();
      const lfoOsc = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const outputGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
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
      filter.connect(outputGain);
      outputGain.connect(ctx.destination);

      outputGain.gain.value = currentParams.volume;
      filter.type = 'lowpass';
      filter.frequency.value = LOWPASS_CUTOFF;

      mainOsc.start();
      lfoOsc.start();
      constantSource.start();

      mainOscRef.current = mainOsc;
      lfoOscRef.current = lfoOsc;
      lfoGainRef.current = lfoGain;
      outputGainRef.current = outputGain;
      filterRef.current = filter;
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
      stopOscillators();
    };
  }, [stopOscillators]);

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
