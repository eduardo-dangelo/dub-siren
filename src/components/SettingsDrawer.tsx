import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DelayParams } from '../constants/audioParams';
import {
  DELAY_PRESETS,
  findMatchingPreset,
  applyPreset,
} from '../constants/delayPresets';
import { Knob } from './Knob';
import { PresetSelect } from './PresetSelect';
import { ToggleSwitch } from './ToggleSwitch';
import { pedalColors } from '../theme/pedalColors';
import { Ionicons } from '@expo/vector-icons';

const PRESET_OPTIONS = DELAY_PRESETS.map((p) => ({ id: p.id, label: p.label }));

/** Derive mix (0-1) from dry/wet for display. 0 = all dry, 1 = all wet. */
function mixFromDryWet(dryLevel: number, wetLevel: number): number {
  const sum = dryLevel + wetLevel;
  return sum <= 0 ? 0.5 : wetLevel / sum;
}

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  delayParams: DelayParams;
  onChangeDelayParams: (updater: (prev: DelayParams) => DelayParams) => void;
}

export function SettingsDrawer({
  visible,
  onClose,
  delayParams,
  onChangeDelayParams,
}: SettingsDrawerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const [localParams, setLocalParams] = useState<DelayParams>(delayParams);

  useEffect(() => {
    setLocalParams(delayParams);
  }, [delayParams]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible && !isMounted) return;

    const anim = Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    });

    anim.start(({ finished }) => {
      if (finished && !visible) {
        setIsMounted(false);
      }
    });

    return () => anim.stop();
  }, [visible, slideAnim, isMounted]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [320, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!isMounted) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
        pointerEvents="auto"
      >
        <ImageBackground
          source={require('../../assets/enclosure-metal.png')}
          resizeMode="cover"
          style={styles.drawerBackground}
          imageStyle={styles.drawerImage}
        >
          <View style={styles.drawerOverlay} pointerEvents="none" />
          <View style={styles.header}>
            <Ionicons name="settings-outline" size={18}  style={{ marginRight: 8 }} />
            <Text style={styles.title}>DELAY SETTINGS</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.presetRow}>
              <PresetSelect
                label="PRESET"
                value={
                  findMatchingPreset(localParams)?.id ?? 'custom'
                }
                options={PRESET_OPTIONS}
                onChange={(id) => {
                  const preset = DELAY_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    const next = applyPreset(preset, localParams.enabled);
                    setLocalParams(next);
                    onChangeDelayParams(() => next);
                  }
                }}
              />
              {/* <ToggleSwitch
                label=""
                value={localParams.enabled}
                onToggle={() => {
                  const next = !localParams.enabled;
                  setLocalParams((prev) => ({ ...prev, enabled: next }));
                  onChangeDelayParams((prev) => ({ ...prev, enabled: next }));
                }}
              /> */}
            </View>
            <View style={styles.knobRow}>
              <Knob
                label="FEEDBACK"
                size="small"
                type="default"
                value={localParams.feedback}
                maxValue={1}
                minValue={0}
                continuous
                onValueChange={(v) =>
                  setLocalParams((prev) => ({ ...prev, feedback: v }))
                }
                onValueCommit={(v) =>
                  onChangeDelayParams((prev) => ({ ...prev, feedback: v }))
                }
              />
              <Knob
                label="MIX"
                size="small"
                type="default"
                value={mixFromDryWet(localParams.dryLevel, localParams.wetLevel)}
                maxValue={1}
                minValue={0}
                continuous
                onValueChange={(v) =>
                  setLocalParams((prev) => ({
                    ...prev,
                    dryLevel: 1 - v,
                    wetLevel: v,
                  }))
                }
                onValueCommit={(v) =>
                  onChangeDelayParams((prev) => ({
                    ...prev,
                    dryLevel: 1 - v,
                    wetLevel: v,
                  }))
                }
              />
            </View>
            <View style={styles.knobRow}>
              <Knob
                label="TIME"
                size="large"
                type="default"
                value={localParams.time}
                maxValue={1}
                minValue={0.05}
                continuous
                onValueChange={(v) =>
                  setLocalParams((prev) => ({ ...prev, time: v }))
                }
                onValueCommit={(v) =>
                  onChangeDelayParams((prev) => ({ ...prev, time: v }))
                }
              />
            </View>
            <View>
              <ToggleSwitch
                label="ON/OFF"
                value={localParams.enabled}
                onToggle={() => {
                  const next = !localParams.enabled;
                  setLocalParams((prev) => ({ ...prev, enabled: next }));
                  onChangeDelayParams((prev) => ({ ...prev, enabled: next }));
                }}
              />
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

const DRAWER_WIDTH = 280;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: pedalColors.enclosure,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
  },
  drawerBackground: {
    flex: 1,
  },
  drawerImage: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 180, 180, 0.58)',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: pedalColors.labelText,
    letterSpacing: 1,
  },
  content: {
    padding: 20,
    // paddingBottom: 40,
    
  },
  presetRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  knobRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
});
