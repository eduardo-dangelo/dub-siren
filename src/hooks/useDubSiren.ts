import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioContext,
  BiquadFilterNode,
  ConstantSourceNode,
  DelayNode,
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
  REVERB_DELAY_1,
  REVERB_DELAY_2,
  REVERB_FEEDBACK,
  REVERB_TAIL_CUTOFF,
} from '../constants/audioParams';

export interface DubSirenParams {
  pitch: number; // 0-3
  mode: number; // 0-3
  beat: number; // 0-3 (0 = OFF)
  volume: number; // 0-1
  reverb: number; // 0-1
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
    reverb: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mainOscRef = useRef<OscillatorNode | null>(null);
  const mainOsc2Ref = useRef<OscillatorNode | null>(null);
  const lfoOscRef = useRef<OscillatorNode | null>(null);
  const lfoOsc2Ref = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const lfoGain2Ref = useRef<GainNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const filter2Ref = useRef<BiquadFilterNode | null>(null);
  const manualGainRef = useRef<GainNode | null>(null);
  const manualGain2Ref = useRef<GainNode | null>(null);
  const constantSourceRef = useRef<ConstantSourceNode | null>(null);
  const constantSource2Ref = useRef<ConstantSourceNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const delay1Ref = useRef<DelayNode | null>(null);
  const delay2Ref = useRef<DelayNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const reverbFilterRef = useRef<BiquadFilterNode | null>(null);
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
      if (lfoGain2Ref.current && mainOsc2Ref.current) {
        lfoGain2Ref.current.disconnect(mainOsc2Ref.current.frequency);
      }
      if (manualGainRef.current && mainOscRef.current) {
        manualGainRef.current.disconnect(mainOscRef.current.frequency);
      }
      if (manualGain2Ref.current && mainOsc2Ref.current) {
        manualGain2Ref.current.disconnect(mainOsc2Ref.current.frequency);
      }
      constantSourceRef.current?.disconnect();
      constantSourceRef.current?.stop();
      constantSource2Ref.current?.disconnect();
      constantSource2Ref.current?.stop();
      delay1Ref.current?.disconnect();
      delay2Ref.current?.disconnect();
      dryGainRef.current?.disconnect();
      wetGainRef.current?.disconnect();
      reverbFilterRef.current?.disconnect();
      mainOscRef.current?.disconnect();
      mainOsc2Ref.current?.disconnect();
      lfoOscRef.current?.disconnect();
      lfoOsc2Ref.current?.disconnect();
      mainOscRef.current?.stop();
      mainOsc2Ref.current?.stop();
      lfoOscRef.current?.stop();
      lfoOsc2Ref.current?.stop();
    } catch {
      // Ignore disconnect errors
    }
    mainOscRef.current = null;
    mainOsc2Ref.current = null;
    lfoOscRef.current = null;
    lfoOsc2Ref.current = null;
    lfoGainRef.current = null;
    lfoGain2Ref.current = null;
    outputGainRef.current = null;
    filterRef.current = null;
    filter2Ref.current = null;
    manualGainRef.current = null;
    manualGain2Ref.current = null;
    constantSourceRef.current = null;
    constantSource2Ref.current = null;
    dryGainRef.current = null;
    delay1Ref.current = null;
    delay2Ref.current = null;
    wetGainRef.current = null;
    reverbFilterRef.current = null;
    setIsPlaying(false);
  }, []);

  const startOscillators = useCallback(
    (currentParams: DubSirenParams) => {
      const ctx = getAudioContext();
      if (mainOscRef.current) return;

      const baseFreq = PITCH_FREQUENCIES[currentParams.pitch];
      const waveform = MODE_WAVEFORMS[currentParams.mode] as OscillatorType;
      const beatOff = currentParams.beat === 0;

      const outputGain = ctx.createGain();
      outputGain.gain.value = currentParams.volume;
      outputGain.connect(ctx.destination);

      // Dry path: single chain, no branching (workaround for react-native-audio-api #933)
      const mainOsc = ctx.createOscillator();
      const lfoOsc = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const manualGain = ctx.createGain();
      const constantSource = ctx.createConstantSource();
      const dryGain = ctx.createGain();

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
      filter.type = 'lowpass';
      filter.frequency.value = LOWPASS_CUTOFF;
      dryGain.gain.value = 1 - currentParams.reverb;
      filter.connect(dryGain);
      dryGain.connect(outputGain);

      // Wet path: separate chain, no branching
      const mainOsc2 = ctx.createOscillator();
      const lfoOsc2 = ctx.createOscillator();
      const lfoGain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();
      const manualGain2 = ctx.createGain();
      const constantSource2 = ctx.createConstantSource();
      const delay1 = ctx.createDelay(0.2);
      const delay2 = ctx.createDelay(0.2);
      const feedbackGain1 = ctx.createGain();
      const feedbackGain2 = ctx.createGain();
      const reverbFilter = ctx.createBiquadFilter();
      const wetGain = ctx.createGain();

      mainOsc2.type = 'square';
      mainOsc2.frequency.value = baseFreq;
      lfoOsc2.type = waveform;
      lfoOsc2.frequency.value = beatOff ? 0 : BEAT_RATES[currentParams.beat - 1];
      lfoGain2.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
      constantSource2.offset.value = 1;
      constantSource2.connect(manualGain2);
      manualGain2.gain.value = 0;
      manualGain2.connect(mainOsc2.frequency);
      lfoOsc2.connect(lfoGain2);
      lfoGain2.connect(mainOsc2.frequency);
      mainOsc2.connect(filter2);
      filter2.type = 'lowpass';
      filter2.frequency.value = LOWPASS_CUTOFF;
      delay1.delayTime.value = REVERB_DELAY_1;
      delay2.delayTime.value = REVERB_DELAY_2;
      feedbackGain1.gain.value = REVERB_FEEDBACK;
      feedbackGain2.gain.value = REVERB_FEEDBACK;
      reverbFilter.type = 'lowpass';
      reverbFilter.frequency.value = REVERB_TAIL_CUTOFF;
      wetGain.gain.value = currentParams.reverb;

      filter2.connect(delay1);
      filter2.connect(delay2);
      delay1.connect(feedbackGain1);
      feedbackGain1.connect(delay1);
      delay2.connect(feedbackGain2);
      feedbackGain2.connect(delay2);
      delay1.connect(reverbFilter);
      delay2.connect(reverbFilter);
      reverbFilter.connect(wetGain);
      // Only connect wet path when reverb>0 (react-native-audio-api #933: connected wet path at 0 gain still mutes dry)
      if (currentParams.reverb > 0) {
        wetGain.connect(outputGain);
      }

      const t = ctx.currentTime + 0.01;
      mainOsc.start(t);
      mainOsc2.start(t);
      lfoOsc.start();
      lfoOsc2.start();
      constantSource.start();
      constantSource2.start();

      mainOscRef.current = mainOsc;
      mainOsc2Ref.current = mainOsc2;
      lfoOscRef.current = lfoOsc;
      lfoOsc2Ref.current = lfoOsc2;
      lfoGainRef.current = lfoGain;
      lfoGain2Ref.current = lfoGain2;
      outputGainRef.current = outputGain;
      filterRef.current = filter;
      filter2Ref.current = filter2;
      manualGainRef.current = manualGain;
      manualGain2Ref.current = manualGain2;
      constantSourceRef.current = constantSource;
      constantSource2Ref.current = constantSource2;
      dryGainRef.current = dryGain;
      delay1Ref.current = delay1;
      delay2Ref.current = delay2;
      wetGainRef.current = wetGain;
      reverbFilterRef.current = reverbFilter;
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
    const mainOsc2 = mainOsc2Ref.current;
    const lfoOsc = lfoOscRef.current;
    const lfoOsc2 = lfoOsc2Ref.current;
    const lfoGain = lfoGainRef.current;
    const lfoGain2 = lfoGain2Ref.current;
    const outputGain = outputGainRef.current;
    const dryGain = dryGainRef.current;
    const wetGain = wetGainRef.current;
    if (!mainOsc || !mainOsc2 || !lfoOsc || !lfoOsc2 || !lfoGain || !lfoGain2 || !outputGain || !dryGain || !wetGain) return;

    const baseFreq = PITCH_FREQUENCIES[params.pitch];
    const waveform = MODE_WAVEFORMS[params.mode] as OscillatorType;
    const beatOff = params.beat === 0;

    mainOsc.frequency.setValueAtTime(baseFreq, 0);
    mainOsc2.frequency.setValueAtTime(baseFreq, 0);
    lfoOsc.type = waveform;
    lfoOsc2.type = waveform;
    lfoOsc.frequency.value = beatOff ? 0 : BEAT_RATES[params.beat - 1];
    lfoOsc2.frequency.value = beatOff ? 0 : BEAT_RATES[params.beat - 1];
    lfoGain.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
    lfoGain2.gain.value = beatOff ? 0 : LFO_MODULATION_DEPTH;
    outputGain.gain.value = params.volume;
    dryGain.gain.value = 1 - params.reverb;
    wetGain.gain.value = params.reverb;
    // Connect/disconnect wet path based on reverb (react-native-audio-api #933: connected wet path at 0 gain mutes dry)
    try {
      wetGain.disconnect();
    } catch {
      // Not connected
    }
    if (params.reverb > 0) {
      wetGain.connect(outputGain);
    }
  }, [params, isPlaying]);

  const sirenPress = useCallback(() => {
    if (!isPlaying || params.beat !== 0) return;
    const manualGain = manualGainRef.current;
    const manualGain2 = manualGain2Ref.current;
    if (!manualGain || !manualGain2) return;
    manualGain.gain.setValueAtTime(LFO_MODULATION_DEPTH, 0);
    manualGain2.gain.setValueAtTime(LFO_MODULATION_DEPTH, 0);
  }, [isPlaying, params.beat]);

  const sirenRelease = useCallback(() => {
    const manualGain = manualGainRef.current;
    const manualGain2 = manualGain2Ref.current;
    if (!manualGain || !manualGain2) return;
    manualGain.gain.setValueAtTime(0, 0);
    manualGain2.gain.setValueAtTime(0, 0);
  }, []);

  const tonePress = useCallback(() => {
    if (!isPlaying || params.beat !== 0) return;
    const manualGain = manualGainRef.current;
    const manualGain2 = manualGain2Ref.current;
    if (!manualGain || !manualGain2) return;
    manualGain.gain.setValueAtTime(-LFO_MODULATION_DEPTH, 0);
    manualGain2.gain.setValueAtTime(-LFO_MODULATION_DEPTH, 0);
  }, [isPlaying, params.beat]);

  const toneRelease = useCallback(() => {
    const manualGain = manualGainRef.current;
    const manualGain2 = manualGain2Ref.current;
    if (!manualGain || !manualGain2) return;
    manualGain.gain.setValueAtTime(0, 0);
    manualGain2.gain.setValueAtTime(0, 0);
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
