import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

export type KnobType = 'pitch' | 'mode' | 'beat' | 'volume';

interface KnobProps {
  label: string;
  type: KnobType;
  value: number;
  maxValue: number;
  onValueChange: (value: number) => void;
  labels?: string[]; // e.g. ['1','2','3','4'] or ['OFF','1','2','3']
  verticalLabel?: boolean;
  continuous?: boolean;
  minValue?: number;
}

const KNOB_COLORS: Record<KnobType, string> = {
  pitch: pedalColors.knobPitch,
  mode: pedalColors.knobMode,
  beat: pedalColors.knobBeat,
  volume: pedalColors.knobVolume,
};

const SENSITIVITY = 20; // pixels per step (discrete)
const SENSITIVITY_CONTINUOUS = 150; // pixels for full 0→1 range

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function Knob({
  label,
  type,
  value,
  maxValue,
  onValueChange,
  labels,
  verticalLabel = false,
  continuous = false,
  minValue = 0,
}: KnobProps) {
  const color = KNOB_COLORS[type];
  const valueRange = maxValue - minValue;
  const rotation = valueRange > 0
    ? ((value - minValue) / valueRange) * 270 - 135
    : -135;
  const valueRef = useRef(value);
  valueRef.current = value;
  const startValueRef = useRef(value);
  const lastReportedValueRef = useRef(value);

  const reportValueDiscrete = useCallback(
    (newValue: number) => {
      const clamped = clamp(Math.round(newValue), 0, maxValue);
      if (clamped !== lastReportedValueRef.current) {
        lastReportedValueRef.current = clamped;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(clamped);
      }
    },
    [maxValue, onValueChange]
  );

  const reportValueContinuous = useCallback(
    (newValue: number) => {
      const clamped = clamp(newValue, minValue, maxValue);
      onValueChange(clamped);
    },
    [minValue, maxValue, onValueChange]
  );

  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = (value + 1) % (maxValue + 1);
    onValueChange(next);
  }, [value, maxValue, onValueChange]);

  const gesture = useMemo(() => {
    if (continuous) {
      return Gesture.Pan()
        .runOnJS(true)
        .minDistance(8)
        .onStart(() => {
          startValueRef.current = valueRef.current;
        })
        .onUpdate((e) => {
          const effectiveDelta = -e.translationY - e.translationX;
          const delta = effectiveDelta / SENSITIVITY_CONTINUOUS;
          const newValue = startValueRef.current + delta * valueRange;
          reportValueContinuous(newValue);
        });
    }

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(handleTap);

    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(8)
      .onStart(() => {
        startValueRef.current = valueRef.current;
      })
      .onUpdate((e) => {
        const effectiveDelta = -e.translationY - e.translationX;
        const steps = Math.round(effectiveDelta / SENSITIVITY);
        const newValue = startValueRef.current + steps;
        reportValueDiscrete(newValue);
      });

    return Gesture.Exclusive(tap, pan);
  }, [continuous, valueRange, handleTap, reportValueDiscrete, reportValueContinuous]);

  const displayLabel = continuous
    ? `${Math.round(value * 9)}`
    : labels
      ? labels[value]
      : String(value + 1);

  return (
    <View style={[styles.container, verticalLabel && styles.containerVertical]}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, verticalLabel && styles.labelVertical]}>{label}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View style={styles.knobWrapper}>
          <View
            style={[
              styles.knob,
              { backgroundColor: color },
              { transform: [{ rotate: `${rotation}deg` }] },
            ]}
          >
            <View style={styles.indicator} />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.valueLabelContainer}>
        <Text style={styles.valueLabel}>{displayLabel}</Text>
      </View>
    </View>
  );
}

const KNOB_HEIGHT = 140;
const TITLE_HEIGHT = 'auto';

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    width: KNOB_HEIGHT,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 0,
  },
  containerVertical: {
    flexDirection: 'row',
    width: KNOB_HEIGHT,
  },
  labelContainer: {
    flex: 1,
    width: TITLE_HEIGHT,
    height: TITLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.labelText,
    // marginBottom: 4,
    margin: 0,
    letterSpacing: 0.5,
  },
  labelVertical: {
    marginBottom: 0,
    marginRight: 8,
    transform: [{ rotate: '-90deg' }],
  },
  knobWrapper: {
    padding: 4,
    transform: [{ rotate: '-90deg' }],
  },
  knob: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    boxShadow: '0 0 18px 0 rgba(0, 0, 0, 0.9)',
  },
  indicator: {
    width: 2,
    height: 14,
    backgroundColor: pedalColors.indicatorWhite,
    borderRadius: 1,
    position: 'absolute',
    top: 2,
  },
  valueLabelContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  valueLabel: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: 12,
    color: pedalColors.labelText,
    margin: 8,
    transform: [{ rotate: '-90deg' }],
  },
});
