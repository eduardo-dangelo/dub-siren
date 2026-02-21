import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Knob } from './src/components/Knob';
import { PedalEnclosure } from './src/components/PedalEnclosure';
import { PowerLed } from './src/components/PowerLed';
import { SirenButton } from './src/components/SirenButton';
import { ToggleSwitch } from './src/components/ToggleSwitch';
import { useDubSiren } from './src/hooks/useDubSiren';
import { pedalColors } from './src/theme/pedalColors';

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
    <Pressable style={styles.container} onPress={handleFirstInteraction}>
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
              labels={['1', '2', '3', 'OFF']}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pedalColors.enclosureDark,
    justifyContent: 'center',
    alignItems: 'center',
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
});
