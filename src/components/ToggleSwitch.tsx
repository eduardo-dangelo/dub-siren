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
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 50,
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
    width: 34,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#555',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: pedalColors.toggleChrome,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
