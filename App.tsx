import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Knob } from './src/components/Knob';
import { PedalEnclosure } from './src/components/PedalEnclosure';
import { PowerLed } from './src/components/PowerLed';
import { SirenButton } from './src/components/SirenButton';
import { ToggleSwitch } from './src/components/ToggleSwitch';
import { useDubSiren } from './src/hooks/useDubSiren';
import { pedalColors } from './src/theme/pedalColors';
import { CableJack } from './src/components/CableJack';

export default function App() {
  const {
    params,
    setParams,
    isPlaying,
    trigger,
    momentaryPress,
    momentaryRelease,
    sirenPress,
    sirenRelease,
    tonePress,
    toneRelease,
    resumeContext,
  } = useDubSiren();

  const hasResumedRef = useRef(false);
  const handleFirstInteraction = useCallback(async () => {
    if (!hasResumedRef.current) {
      hasResumedRef.current = true;
      await resumeContext();
    }
  }, [resumeContext]);

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
              verticalLabel
            />
            <Knob
              label="MODE"
              type="mode"
              value={params.mode}
              maxValue={3}
              onValueChange={(v) => setParams({ mode: v })}
              labels={['1', '2', '3', '4']}
              verticalLabel
            />
            <Knob
              label="BEAT"
              type="beat"
              value={params.beat}
              maxValue={3}
              onValueChange={(v) => setParams({ beat: v })}
              labels={['0', '1', '2', '3']}
              verticalLabel
            />
            <Knob
              label="VOL"
              type="volume"
              value={params.volume}
              maxValue={1}
              minValue={0}
              continuous
              onValueChange={(v) => setParams({ volume: v })}
              verticalLabel
            />
            <Knob
              label="REV"
              type="reverb"
              value={params.reverb}
              maxValue={1}
              minValue={0}
              continuous
              onValueChange={(v) => setParams({ reverb: v })}
              verticalLabel
            />
            </View>
            <View style={styles.leftColumn}>
            <PowerLed label="POWER" isOn={isPlaying} verticalLabel />            
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
            <SirenButton
              label="HOLD"
              onPressIn={momentaryPress}
              onPressOut={momentaryRelease}
              // verticalLabel
            />
            <ToggleSwitch label="TRIGGER" value={isPlaying} onToggle={trigger} verticalLabel />
            </View>
          </View>
        </PedalEnclosure>
        <View style={styles.jackBottom}>
          {/* <CableJack variant="power" orientation="bottom" /> */}
          {/* <CableJack variant="input" orientation="bottom" /> */}
          {/* <CableJack variant="power" orientation="bottom" /> */}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: 12,
  },
  leftColumn: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rightColumn: {
    flexDirection: 'column',
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
  jackBottom: {
    position: 'absolute',
    top: '85%',
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
