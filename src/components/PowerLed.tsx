import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { pedalColors } from '../theme/pedalColors';

interface PowerLedProps {
  label: string;
  isOn: boolean;
  verticalLabel?: boolean;
}

export function PowerLed({ label, isOn, verticalLabel = false }: PowerLedProps) {
  return (
    <View style={[styles.container, verticalLabel && styles.containerVertical]}>
      <Text style={[styles.label, verticalLabel && styles.labelVertical]}>{label}</Text>
      <View
        style={[
          styles.led,
          { backgroundColor: isOn ? pedalColors.powerLedOn : pedalColors.powerLedOff },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 44,
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
  led: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#222',
  },
});
