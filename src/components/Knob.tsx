import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

export type KnobType = 'pitch' | 'mode' | 'beat';

interface KnobProps {
  label: string;
  type: KnobType;
  value: number;
  maxValue: number;
  onValueChange: (value: number) => void;
  labels?: string[]; // e.g. ['1','2','3','4'] or ['OFF','1','2','3']
  verticalLabel?: boolean;
}

const KNOB_COLORS: Record<KnobType, string> = {
  pitch: pedalColors.knobPitch,
  mode: pedalColors.knobMode,
  beat: pedalColors.knobBeat,
};

export function Knob({
  label,
  type,
  value,
  maxValue,
  onValueChange,
  labels,
  verticalLabel = false,
}: KnobProps) {
  const color = KNOB_COLORS[type];
  const rotation = (value / maxValue) * 270 - 135;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = (value + 1) % (maxValue + 1);
    onValueChange(next);
  };

  const displayLabel = labels ? labels[value] : String(value + 1);

  return (
    <View style={[styles.container, verticalLabel && styles.containerVertical]}>
      <Text style={[styles.label, verticalLabel && styles.labelVertical]}>{label}</Text>
      <Pressable onPress={handlePress} style={styles.knobWrapper}>
        <View
          style={[
            styles.knob,
            { backgroundColor: color },
            { transform: [{ rotate: `${rotation}deg` }] },
          ]}
        >
          <View style={styles.indicator} />
        </View>
      </Pressable>
      <Text style={styles.valueLabel}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 56,
  },
  containerVertical: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.labelText,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  labelVertical: {
    marginBottom: 0,
    marginRight: 8,
    transform: [{ rotate: '-90deg' }],
  },
  knobWrapper: {
    padding: 4,
  },
  knob: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  indicator: {
    width: 2,
    height: 12,
    backgroundColor: pedalColors.indicatorWhite,
    borderRadius: 1,
    position: 'absolute',
    top: 2,
  },
  valueLabel: {
    fontSize: 9,
    color: pedalColors.labelText,
    marginTop: 4,
  },
});
