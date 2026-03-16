import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import { pedalColors } from '../theme/pedalColors';

const SLOT_COLOR = '#0a0a0a';

interface ScrewProps {
  style: ViewStyle;
  screwRotation?: number;
}

function Screw({ style, screwRotation = 0 }: ScrewProps) {
  const slotStyle = screwRotation
    ? [styles.screwSlot, { transform: [{ rotate: `${screwRotation}deg` }] }]
    : styles.screwSlot;
  return (
    <View style={[styles.screwBase, style]}>
      <View style={slotStyle}>
        <View style={styles.screwSlotVertical} />
        <View style={styles.screwSlotHorizontal} />
      </View>
    </View>
  );
}

interface PedalEnclosureProps {
  children: React.ReactNode;
}

function randomScrewRotation() {
  return Math.floor(Math.random() * 45);
}

export function PedalEnclosure({ children }: PedalEnclosureProps) {
  const [r1, r2, r3, r4] = useMemo(
    () => [randomScrewRotation(), randomScrewRotation(), randomScrewRotation(), randomScrewRotation()],
    []
  );
  return (
    <ImageBackground
      source={require('../../assets/enclosure-metal.png')}
      resizeMode="cover"
      style={styles.enclosure}
      imageStyle={styles.enclosureImage}
    >
      <View style={styles.overlay} pointerEvents="none" />
      <Screw style={styles.screwTopLeft} screwRotation={r1} />
      <Screw style={styles.screwTopRight} screwRotation={r2} />
      <View style={styles.content}>{children}</View>
      <Screw style={styles.screwBottomLeft} screwRotation={r3} />
      <Screw style={styles.screwBottomRight} screwRotation={r4} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  enclosure: {
    flex: 1,
    backgroundColor: pedalColors.enclosure,
    borderRadius: 8,
    padding: 36,
    margin: 12,
    maxWidth: '70%',
    // height: '80%',
    maxHeight: 350,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    boxShadow: '21px 21px 48px 0 rgba(0, 0, 0, 0.9), -21px -21px 48px 0 rgba(255, 255, 255, 0.1), inset 2px 2px 4px rgba(42, 42, 42, 0.2), inset -2px -2px 4px rgba(40, 40, 40, 0.5)',
    zIndex: 10,
  },
  enclosureImage: {
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 180, 180, 0.58)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    // borderWidth: 1,
  },
  screwBase: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: pedalColors.screwMetal,
    borderWidth: 1,
    borderColor: '#222',
    position: 'absolute',
    boxShadow: 'inset 1px 1px 3px rgba(135, 135, 135, 0.5), inset -1px -1px 0 rgba(0, 0, 0, 0.5), 4px 4px 14px 0 rgba(0, 0, 0, 0.7), -6px -6px 14px 0 rgba(255, 255, 255, 0.4)',
  },
  screwSlot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    marginTop: -2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screwSlotVertical: {
    position: 'absolute',
    left: 2,
    top: 0,
    width: 1,
    height: 5,
    backgroundColor: SLOT_COLOR,
  },
  screwSlotHorizontal: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 5,
    height: 1,
    backgroundColor: SLOT_COLOR,
  },
  screwTopLeft: {
    top: 10,
    left: 10,
  },
  screwTopRight: {
    top: 10,
    right: 10,
  },
  screwBottomLeft: {
    bottom: 10,
    left: 10,
  },
  screwBottomRight: {
    bottom: 10,
    right: 10,
  },
});
