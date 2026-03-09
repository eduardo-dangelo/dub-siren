import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

export interface PresetOption {
  id: string;
  label: string;
}

interface PresetSelectProps {
  label?: string;
  value: string;
  options: PresetOption[];
  onChange: (id: string) => void;
}

export function PresetSelect({
  label = 'PRESET',
  value,
  options,
  onChange,
}: PresetSelectProps) {
  const currentIndex = options.findIndex((o) => o.id === value);
  const displayLabel = options[currentIndex]?.label ?? 'CUSTOM';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex].id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={handlePress} style={styles.bezel}>
        <View style={styles.display}>
          <Text style={styles.displayText} numberOfLines={1}>
            {displayLabel}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.labelText,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bezel: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  display: {
    backgroundColor: '#0a1a0a',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  displayText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '600',
    color: '#33ff33',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
