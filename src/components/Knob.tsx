import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { pedalColors } from '../theme/pedalColors';
import { darken, lighten } from '../theme/colorUtils';

export type KnobType = 'pitch' | 'mode' | 'beat' | 'volume' | 'default';

export type KnobSize = 'small' | 'medium' | 'large';

interface KnobProps {
  label: string;
  type: KnobType;
  value: number;
  maxValue: number;
  onValueChange: (value: number) => void;
  /** Called when the user releases the knob (or taps for discrete). Use for applying changes only on release. */
  onValueCommit?: (value: number) => void;
  labels?: string[]; // e.g. ['1','2','3','4'] or ['OFF','1','2','3']
  verticalLabel?: boolean;
  continuous?: boolean;
  minValue?: number;
  /** Optional arc in degrees for non-pitch/mode/beat knobs; defaults to legacy 270°. */
  arcDegrees?: number;
  /** Rotation angle (degrees) for the minimum value; arc sweeps clockwise from here. Default 0 (up). */
  arcStartDegrees?: number;
  /** Knob size: small (0.75x), medium (1x), large (1.25x). Default "medium". */
  size?: KnobSize;
}

const KNOB_COLORS: Record<KnobType, string> = {
  pitch: pedalColors.knobPitch,
  mode: pedalColors.knobMode,
  beat: pedalColors.knobBeat,
  volume: pedalColors.knobVolume,
  default: pedalColors.knobDefault,
};

const BASE = {
  containerWidth: 100,
  knobSize: 68,
  wrapperPadding: 4,
  wrapperMargin: 10,
  wrapperBorderRadius: 10,
  indicatorWidth: 2,
  indicatorHeight: 14,
  indicatorTop: 2,
  indicatorBorderRadius: 1,
} as const;

const SIZE_SCALE: Record<KnobSize, number> = {
  small: 0.75,
  medium: 1,
  large: 1.45,
};

function getSizeConfig(size: KnobSize) {
  const scale = SIZE_SCALE[size];
  const knobSize = Math.round(BASE.knobSize * scale);
  return {
    containerWidth: Math.round(BASE.containerWidth * scale),
    knobSize,
    knobBorderRadius: knobSize / 2,
    wrapperPadding: Math.round(BASE.wrapperPadding * scale),
    wrapperMargin: Math.round(BASE.wrapperMargin * scale),
    wrapperBorderRadius: Math.round(BASE.wrapperBorderRadius * scale),
    indicatorWidth: Math.max(1, Math.round(BASE.indicatorWidth * scale)),
    indicatorHeight: Math.round(BASE.indicatorHeight * scale),
    indicatorTop: Math.round(BASE.indicatorTop * scale),
    indicatorBorderRadius: Math.max(1, Math.round(BASE.indicatorBorderRadius * scale)),
  };
}

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
  onValueCommit,
  labels,
  verticalLabel = false,
  continuous = false,
  minValue = 0,
  arcDegrees,
  arcStartDegrees = -135,
  size = 'medium',
}: KnobProps) {
  const sizeConfig = useMemo(() => getSizeConfig(size), [size]);
  const color = KNOB_COLORS[type];
  const gradientColors = useMemo(() => {
    const s = color;
    const s1 = lighten(s, 9);
    const s2 = lighten(s, 2.5);
    const s4 = darken(s, 10);
    return [s2, s2, s4, s, s, s1, s2, s2] as const;
  }, [color]);
  const valueRange = maxValue - minValue;
  // Non-pitch/mode/beat: min value at arcStartDegrees, then arc sweeps clockwise.
  const rotation =
    type === 'pitch' || type === 'mode' || type === 'beat'
      ? valueRange > 0
        ? ((value - minValue) / valueRange) * 90
        : 0
      : valueRange > 0
        ? (() => {
            const arc = arcDegrees ?? 270;
            const start = arcStartDegrees;
            const normalized = (value - minValue) / valueRange;
            return start + normalized * arc;
          })()
        : 0;
  const valueRef = useRef(value);
  valueRef.current = value;
  const startValueRef = useRef(value);
  const lastReportedValueRef = useRef(value);
  const lastReportedContinuousRef = useRef(value);

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
      lastReportedContinuousRef.current = clamped;
      onValueChange(clamped);
    },
    [minValue, maxValue, onValueChange]
  );

  const handleCommit = useCallback(
    (finalValue: number) => {
      onValueCommit?.(finalValue);
    },
    [onValueCommit]
  );

  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = (value + 1) % (maxValue + 1);
    onValueChange(next);
    onValueCommit?.(next);
  }, [value, maxValue, onValueChange, onValueCommit]);

  const gesture = useMemo(() => {
    if (continuous) {
      return Gesture.Pan()
        .runOnJS(true)
        .minDistance(8)
        .onStart(() => {
          startValueRef.current = valueRef.current;
        })
        .onUpdate((e) => {
          const effectiveDelta = -e.translationY + e.translationX;
          const delta = effectiveDelta / SENSITIVITY_CONTINUOUS;
          const newValue = startValueRef.current + delta * valueRange;
          reportValueContinuous(newValue);
        })
        .onEnd(() => {
          handleCommit(lastReportedContinuousRef.current);
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
        const effectiveDelta = -e.translationY + e.translationX;
        const steps = Math.round(effectiveDelta / SENSITIVITY);
        const newValue = startValueRef.current + steps;
        reportValueDiscrete(newValue);
      })
      .onEnd(() => {
        handleCommit(lastReportedValueRef.current);
      });

    return Gesture.Exclusive(tap, pan);
  }, [continuous, valueRange, handleTap, handleCommit, reportValueDiscrete, reportValueContinuous]);

  const displayLabel = continuous
    ? `${Math.round(value * 9)}`
    : labels
      ? labels[value]
      : String(value + 1);

  const s = sizeConfig;
  return (
    <View style={[styles.container, { width: s.containerWidth }]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.knobWrapper,
            {
              padding: s.wrapperPadding,
              marginTop: s.wrapperMargin,
              marginBottom: s.wrapperMargin,
              borderRadius: s.wrapperBorderRadius,
            },
          ]}
        >
          <View
            style={[
              styles.knobShadow,
              {
                width: s.knobSize,
                height: s.knobSize,
                borderRadius: s.knobBorderRadius,
              },
            ]}
          >
            <View
              style={[
                styles.knob,
                {
                  width: s.knobSize,
                  height: s.knobSize,
                  borderRadius: s.knobBorderRadius,
                  transform: [{ rotate: `${rotation}deg` }],
                },
              ]}
            >
              <LinearGradient
                colors={[...gradientColors]}
                locations={[0, 0.1, 0.308, 0.32, 0.68, 0.692, 0.9, 1]}
                start={
                  rotation >= -25 && rotation < 180
                    ? { x: 1, y: 0 }
                    : { x: 0, y: 0 }
                }
                end={
                  rotation >= -25 && rotation < 180
                    ? { x: 0, y: 0 }
                    : { x: 1, y: 0 }
                }
                style={[
                  styles.knobGradient,
                  {
                    width: s.knobSize,
                    height: s.knobSize,
                    borderRadius: s.knobBorderRadius,
                  },
                ]}
              />
              <View
                style={[
                  styles.indicator,
                  {
                    width: s.indicatorWidth,
                    height: s.indicatorHeight,
                    top: s.indicatorTop,
                    borderRadius: s.indicatorBorderRadius,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </GestureDetector>
      {/* <View style={styles.valueLabelContainer}>
        <Text style={styles.valueLabel}>{displayLabel}</Text>
      </View> */}
    </View>
  );
}

const KNOB_WIDTH = 100;
const TITLE_HEIGHT = 'auto';

const styles = StyleSheet.create({
  container: {
    width: KNOB_WIDTH,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 0,
  },
  labelContainer: {
    width: TITLE_HEIGHT,
    height: TITLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.labelText,
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
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    // overflow: 'hidden',
    // boxShadow: '0 0 18px 0 rgba(0, 0, 0, 0.9), 0 28px 28px 0 rgba(0, 0, 0, 0.3)',
    
  },
  knobShadow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    boxShadow: '0 0 18px 0 rgba(0, 0, 0, 0.9), 0 28px 28px 0 rgba(0, 0, 0, 0.3)',
  },
  knob: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 3,
    // borderColor: 'rgba(0,0,0,0.2)',
    // boxShadow: '0 0 18px 0 rgba(0, 0, 0, 0.9), 0 28px 28px 0 rgba(0, 0, 0, 0.3)',
    // overflow: 'hidden',
  },
  knobGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    // borderColor: 'linear-g radient(to top, rgba(255, 255, 255, 0.2), rgba(0,0,0,0.2))',
  },
  knobHolder: {
    width: 26,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 28px 0 rgba(0, 0, 0, 0.6),inset 0 0 8px 0 rgba(175, 175, 175, 0.3)',
    borderRadius: 7,
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
  },
});
