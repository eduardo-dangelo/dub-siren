import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DelayParams } from '../constants/audioParams';
import { Knob } from './Knob';
import { ToggleSwitch } from './ToggleSwitch';
import { pedalColors } from '../theme/pedalColors';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  delayParams: DelayParams;
  onChangeDelayParams: (updater: (prev: DelayParams) => DelayParams) => void;
}

const ECHO_LABELS = Array.from({ length: 20 }, (_, i) => String(i + 1));

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
        <View style={styles.header}>
          <Text style={styles.title}>DELAY SETTINGS</Text>
        
        </View>
        <View style={styles.content}>
        
          <View style={styles.knobRow}>
            <Knob
              label="TIME"
              type="volume"
              value={localParams.time}
              maxValue={1}
              minValue={0.1}
              continuous
              onValueChange={(v) =>
                setLocalParams((prev) => ({ ...prev, time: v }))
              }
              onValueCommit={(v) =>
                onChangeDelayParams((prev) => ({ ...prev, time: v }))
              }
            />
            <Knob
              label="FEEDBACK"
              type="volume"
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
              label="DRY"
              type="volume"
              value={localParams.dryLevel}
              maxValue={1}
              minValue={0}
              continuous
              onValueChange={(v) =>
                setLocalParams((prev) => ({ ...prev, dryLevel: v }))
              }
              onValueCommit={(v) =>
                onChangeDelayParams((prev) => ({ ...prev, dryLevel: v }))
              }
            />
            <Knob
              label="WET"
              type="volume"
              value={localParams.wetLevel}
              maxValue={1}
              minValue={0}
              continuous
              onValueChange={(v) =>
                setLocalParams((prev) => ({ ...prev, wetLevel: v }))
              }
              onValueCommit={(v) =>
                onChangeDelayParams((prev) => ({ ...prev, wetLevel: v }))
              }
            />
            <Knob
              label="ECHO"
              type="beat"
              value={localParams.echoCount - 1}
              maxValue={19}
              onValueChange={(v) =>
                setLocalParams((prev) => ({ ...prev, echoCount: v + 1 }))
              }
              onValueCommit={(v) =>
                onChangeDelayParams((prev) => ({
                  ...prev,
                  echoCount: v + 1,
                }))
              }
              labels={ECHO_LABELS}
            />
              <View style={styles.toggleRow}>
             <ToggleSwitch
              label="ENABLED"
              value={localParams.enabled}
              onToggle={() => {
                const next = !localParams.enabled;
                setLocalParams((prev) => ({ ...prev, enabled: next }));
                onChangeDelayParams((prev) => ({ ...prev, enabled: next }));
              }}
            />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const DRAWER_WIDTH = 380;

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
    backgroundColor: 'rgba(169, 169, 169, 0.9)',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingBottom: 40,
    
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: pedalColors.labelText,
    letterSpacing: 1,
  },
  content: {
    padding: 20,
  },
  toggleRow: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  knobRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
});
