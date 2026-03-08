import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';
import { LinearGradient } from 'expo-linear-gradient';

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
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.2)', 'rgba(0,0,0,0.2)']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.buttonGradient}
      />
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
  buttonGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 60,
    height: 60,
    borderRadius: 29,
    // boxShadow: 'inset 1px 1px 0 rgba(255, 255, 255, 0.2), inset -1px -1px 0 rgba(0, 0, 0, 0.2)',
  },
  button: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: pedalColors.buttonBlack,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    boxShadow: '11px 11px 22px rgba(0, 0, 0, 0.3), -11px -11px 22px rgba(255, 255, 255, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.2), inset -1px -1px 0 rgba(0, 0, 0, 0.2)',
  },
  buttonPressed: {
    boxShadow: '11px 11px 22px rgba(0, 0, 0, 0.3), -11px -11px 22px rgba(255, 255, 255, 0.3), inset -1px -1px 0 rgba(0, 0, 0, 0.8), inset 1px 1px 0 rgba(0, 0, 0, 0.8)',
    paddingTop:1,

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
