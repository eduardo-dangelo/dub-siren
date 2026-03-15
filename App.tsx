import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AudioManager } from 'react-native-audio-api';
import { Knob } from './src/components/Knob';
import { PedalEnclosure } from './src/components/PedalEnclosure';
import { PowerLed } from './src/components/PowerLed';
import { InfoDrawer } from './src/components/InfoDrawer';
import { SettingsDrawer } from './src/components/SettingsDrawer';
import { SirenButton } from './src/components/SirenButton';
import { ToggleSwitch } from './src/components/ToggleSwitch';
import { useDubSiren } from './src/hooks/useDubSiren';
import { pedalColors } from './src/theme/pedalColors';
import { CableJack } from './src/components/CableJack';

export default function App() {
  useEffect(() => {
    // Use playAndRecord + defaultToSpeaker so output routes to device speaker on iOS.
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'default',
      iosOptions: ['defaultToSpeaker', 'allowBluetoothA2DP'],
    });
    // Explicitly activate the session for reliable startup on iOS.
    void AudioManager.setAudioSessionActivity(true);
  }, []);

  const {
    params,
    setParams,
    delayParams,
    setDelayParams,
    isPlaying,
    beatPeriodMs,
    trigger,
    momentaryPress,
    momentaryRelease,
    sirenPress,
    sirenRelease,
    tonePress,
    toneRelease,
    resumeContext,
  } = useDubSiren();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const hasResumedRef = useRef(false);
  const handleFirstInteraction = useCallback(async () => {
    if (!hasResumedRef.current) {
      hasResumedRef.current = true;
      await resumeContext();
    }
  }, [resumeContext]);

  const handleSettingsPress = useCallback(async () => {
    await handleFirstInteraction();
    setIsSettingsOpen((prev) => !prev);
  }, [handleFirstInteraction]);

  const handleInfoPress = useCallback(async () => {
    await handleFirstInteraction();
    setIsInfoOpen((prev) => !prev);
  }, [handleFirstInteraction]);

  return (
    <GestureHandlerRootView style={styles.container}>
    <Pressable style={styles.fill} onPress={handleFirstInteraction}>
      <ImageBackground
        source={require('./assets/app-bg.png')}
        resizeMode="cover"
        style={styles.background}
      >
        <View style={styles.overlay} pointerEvents="none" />
        <StatusBar style="dark" />
        <Pressable
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          accessibilityLabel="Settings"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
        <Pressable
          style={styles.infoButton}
          onPress={handleInfoPress}
          accessibilityLabel="How to use"
        >
          <Ionicons name="information-circle-outline" size={26} color={pedalColors.toggleChrome} />
        </Pressable>
        <PedalEnclosure>
          <View style={styles.landscapeLayout}>
            <View style={styles.rightColumn}>
            <Knob
              label="PITCH"
              type="pitch"
              value={params.pitch}
              maxValue={3}
              onValueChange={(v) => setParams({ pitch: v })}
              labels={['1', '2', '3', '4']}
              // verticalLabelx
            />
            <Knob
              label="MODE"
              type="mode"
              value={params.mode}
              maxValue={3}
              onValueChange={(v) => setParams({ mode: v })}
              labels={['1', '2', '3', '4']}
            />
            <Knob
              label="BEAT"
              type="beat"
              value={params.beat}
              maxValue={3}
              // continuous
              onValueChange={(v) => setParams({ beat: v })}
              labels={['0', '1', '2', '3']}
            />
            <Knob
              label="VOL"
              type="volume"
              value={params.volume}
              maxValue={6}
              minValue={0}
              continuous
              arcDegrees={135}
              arcStartDegrees={0}
              onValueChange={(v) => setParams({ volume: v })}
            />
            </View>
            <View style={styles.leftColumn}>
            <PowerLed label="POWER" isOn={isPlaying} pulsePeriodMs={beatPeriodMs ?? undefined} /> 
            <SirenButton
              label="HOLD"
              onPressIn={momentaryPress}
              onPressOut={momentaryRelease}
              // verticalLabel
            />           
            <SirenButton
              label="SIREN"
              onPressIn={sirenPress}
              onPressOut={sirenRelease}
              // verticalLabel
            />
            <SirenButton
              label="TONE"
              onPressIn={tonePress}
              onPressOut={toneRelease}
              // verticalLabel
            />
            <ToggleSwitch label="TRIGGER" value={isPlaying} onToggle={trigger} />
            </View>
          </View>
        </PedalEnclosure>
        {/* <View style={styles.jackBottom}>
          <CableJack variant="input" orientation="bottom" />
          <CableJack variant="power" orientation="bottom" />
        </View> */}
        <SettingsDrawer
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          delayParams={delayParams}
          onChangeDelayParams={setDelayParams}
        />
        <InfoDrawer
          visible={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      </ImageBackground>
    </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pedalColors.enclosureDark,
  },
  fill: {
    flex: 1,
    
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.88)',
  },
  landscapeLayout: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: 12,
  },
  leftColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rightColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  jacksLeft: {
    position: 'absolute',
    left: -4,
    top: '50%',
    transform: [{ translateY: -19 }],
    flexDirection: 'column',
    gap: 10,
  },
  settingsButton: {
    position: 'absolute',
    top: 32,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
    color: pedalColors.toggleChrome,
  },
  infoButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jackBottom: {
    position: 'absolute',
    top: '65%',
    left: '60%',
    // borderWidth: 1,
    // borderColor: 'red',
    display: 'flex',
    flexDirection: 'row',
    gap: 30,
    // gap: 10,
    // zIndex: 100,
    // transform: [{ translateX: -7 }],
  },
});
