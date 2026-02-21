import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { pedalColors } from '../theme/pedalColors';

interface PedalEnclosureProps {
  children: React.ReactNode;
}

export function PedalEnclosure({ children }: PedalEnclosureProps) {
  return (
    <ImageBackground
      source={require('../../assets/enclosure-metal.png')}
      resizeMode="cover"
      style={styles.enclosure}
      imageStyle={styles.enclosureImage}
    >
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.screwTopLeft} />
      <View style={styles.screwTopRight} />
      <View style={styles.content}>{children}</View>
      <View style={styles.screwBottomLeft} />
      <View style={styles.screwBottomRight} />
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
    maxWidth: '85%',
    maxHeight: '70%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    boxShadow: '3px 6px 18px 0 rgba(0, 0, 0, 0.9)',
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
  },
  screwTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pedalColors.screwMetal,
    borderWidth: 1,
    borderColor: '#333',
  },
  screwTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pedalColors.screwMetal,
    borderWidth: 1,
    borderColor: '#333',
  },
  screwBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pedalColors.screwMetal,
    borderWidth: 1,
    borderColor: '#333',
  },
  screwBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pedalColors.screwMetal,
    borderWidth: 1,
    borderColor: '#333',
  },
 
});
