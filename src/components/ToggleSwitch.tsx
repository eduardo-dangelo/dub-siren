import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

interface ToggleSwitchProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  verticalLabel?: boolean;
}

export function ToggleSwitch({ label, value, onToggle, verticalLabel = false }: ToggleSwitchProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };
  return (
    <View style={[styles.container, verticalLabel && styles.containerVertical]}>
      <Text style={[styles.label, verticalLabel && styles.labelVertical]}>{label}</Text>
      <Pressable onPress={handlePress} style={styles.track}>
        <View
          style={[
            styles.thumb,
            value ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
          ]}
        >
        <View style={{ justifyContent: 'center', alignItems: 'center', height: '100%', marginHorizontal: 2 }}>
          {/* Burger menu icon: three vertical dots */}
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: value ? pedalColors.switchAccent : '#666', marginVertical: 1 }} />
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: value ? pedalColors.switchAccent : '#666', marginVertical: 1 }} />
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: value ? pedalColors.switchAccent : '#666', marginVertical: 1 }} />
        </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 58,
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
  track: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
    boxShadow: '11px 11px 22px rgba(0, 0, 0, 0.5), -11px -11px 22px rgba(255, 255, 255, 0.2), inset 1px 1px 0 rgba(0, 0, 0, 0.2)',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: pedalColors.toggleChrome,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    boxShadow: 'inset 2px 2px 4px rgba(255, 255, 255, 0.5 ), inset -2px -2px 4px rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
});
