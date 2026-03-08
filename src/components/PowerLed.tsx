import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { pedalColors } from '../theme/pedalColors';

interface PowerLedProps {
  label: string;
  isOn: boolean;
  pulsePeriodMs?: number | null;
  verticalLabel?: boolean;
}

export function PowerLed({ label, isOn, pulsePeriodMs, verticalLabel = false }: PowerLedProps) {
  const pulseValue = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const period = pulsePeriodMs != null && pulsePeriodMs > 0 ? pulsePeriodMs : 0;
    const shouldPulse = isOn && period > 0;

    if (!shouldPulse) {
      pulseValue.setValue(isOn ? 1 : 0);
      return;
    }

    const half = period / 2;
    const cycle = Animated.sequence([
      Animated.timing(pulseValue, {
        toValue: 0.35,
        duration: half,
        useNativeDriver: true,
      }),
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: half,
        useNativeDriver: true,
      }),
    ]);
    loopRef.current = Animated.loop(cycle, { resetBeforeIteration: true });
    loopRef.current.start();
    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [isOn, pulsePeriodMs, pulseValue]);

  const showPulse = isOn && pulsePeriodMs != null && pulsePeriodMs > 0;
  const ledColor = isOn ? pedalColors.powerLedOn : pedalColors.powerLedOff;

  return (
    <View style={[styles.container, verticalLabel && styles.containerVertical]}>
      <Text style={[styles.label, verticalLabel && styles.labelVertical]}>{label}</Text>
      {showPulse ? (
        <Animated.View
          style={[styles.led, { backgroundColor: ledColor, opacity: pulseValue }, isOn && styles.ledGlow]}
        />
      ) : (
        <View style={[styles.led, { backgroundColor: ledColor }, isOn && styles.ledGlow]} />
      )}
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
  ledGlow: {
    shadowColor: pedalColors.powerLedOn,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
});
