import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

interface SirenButtonProps {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  verticalLabel?: boolean;
}

export function SirenButton({ label, onPressIn, onPressOut, verticalLabel = false }: SirenButtonProps) {
  const button = (
    <Pressable
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn();
      }}
      onPressOut={onPressOut}
      onPress={() => {}}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      {!verticalLabel && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );

  if (verticalLabel) {
    return (
      <View style={styles.containerVertical}>
        <Text style={styles.labelVertical}>{label}</Text>
        {button}
      </View>
    );
  }

  return <View style={styles.container}>{button}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerVertical: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: pedalColors.buttonBlack,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    transform: [{ rotate: '-90deg' }],
    boxShadow: '-1px 2px 6px 0 rgba(0, 0, 0, 0.2)',
  },
  buttonPressed: {
    // backgroundColor: '#333',
    transform: [{ rotate: '-90deg' }],
    boxShadow: 'none',
  },
  label: {
    marginBottom: 4,
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.indicatorWhite,
    letterSpacing: 0.5,
  },
  labelVertical: {
    marginRight: 8,
    fontSize: 10,
    fontWeight: '600',
    color: pedalColors.indicatorWhite,
    letterSpacing: 0.5,
    transform: [{ rotate: '-90deg' }],
  },
});
