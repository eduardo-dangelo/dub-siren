import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { pedalColors } from '../theme/pedalColors';

interface ToggleSwitchProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  verticalLabel?: boolean;
}

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 24;
const THUMB_WIDTH = 30;
const THUMB_HEIGHT = 18;
const TRACK_PADDING = 3;

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
          <View style={styles.barsWrapper}>
            <View style={[styles.bar]} />
            <View style={[styles.bar]} />
            <View style={[styles.bar]} />
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
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: TRACK_PADDING,
    boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -1px -1px 2px rgba(255, 255, 255, 0.1)',
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    backgroundColor: pedalColors.toggleChrome,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
    boxShadow: 'inset 2px 2px 4px rgba(255, 255, 255, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.35)',
    zIndex: 10,
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 14,
    height: 14,
  },
  bar: {
    width: 2.5,
    height: 14,
    borderRadius: 1.25,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    boxShadow: 'inset -1px -1px 2px rgba(0, 0, 0, 0.15), inset 1px 1px 1px rgba(255, 255, 255, 0.15), 1px 1px 1px rgba(0, 0, 0, 0.1)',
  },

});
