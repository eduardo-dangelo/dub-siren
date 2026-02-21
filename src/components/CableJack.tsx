import React from 'react';
import { StyleSheet, View } from 'react-native';
import { pedalColors } from '../theme/pedalColors';

type CableJackVariant = 'input' | 'output' | 'power';
type CableJackOrientation = 'left' | 'bottom';

interface CableJackProps {
  variant?: CableJackVariant;
  orientation?: CableJackOrientation;
}

const SOCKET_SIZE = 20;
const SOCKET_HEIGHT = 84;
const HOLE_SIZE = 6;
const PLUG_WIDTH = 24 ;
const PLUG_HEIGHT = 6;
const CABLE_WIDTH = 12;
const CABLE_LENGTH = 222;

export function CableJack({ variant = 'input', orientation = 'left' }: CableJackProps) {
  const isVertical = orientation === 'bottom';

  return (
    <View style={[styles.wrapper, isVertical && styles.wrapperVertical]}>
      {/* Cable - extends outward from the pedal */}

      {/* Plug - overlaps the socket */}
      <View style={[styles.plug, isVertical && styles.plugVertical]} />
      <View style={styles.socket} />
      <View style={[styles.cable, isVertical && styles.cableVertical]} />
      {/* Jack socket - metal ring with hole */}

        {/* <View style={styles.hole} /> */}
      {/* </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    // position: 'relative', 
    // borderColor: 'red',   
  },
  wrapperVertical: {
    flexDirection: 'column',
  },
  socket: {
    width: SOCKET_SIZE,
    height: SOCKET_HEIGHT,
    borderRadius:  2,
    backgroundColor: pedalColors.jackMetal,
    boxShadow: '8px 0 10px 0 rgba(0, 0, 0, 0.3), inset 6px 0 8px 0 rgba(255, 255, 255, 0.05), inset -6px 0 8px 0 rgba(0, 0, 0, 0.4)',
  },
  hole: {
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    borderRadius: HOLE_SIZE / 2,
    backgroundColor: pedalColors.enclosureDark,
  },
  plug: {
    width: PLUG_HEIGHT,
    height: PLUG_WIDTH,
    borderRadius: 2,
    backgroundColor: pedalColors.cableBlack,
    boxShadow: '8px 1px 6px 0 rgba(0, 0, 0, 0.2), inset 6px 0 8px 0 rgba(255, 255, 255, 0.1), inset -6px 0 8px 0 rgba(0, 0, 0, 0.6)',
  },
  plugVertical: {
    width: PLUG_WIDTH,
    height: PLUG_HEIGHT,
  },
  cable: {
    width: CABLE_LENGTH,
    height: CABLE_WIDTH,
    backgroundColor: pedalColors.cableBlack,
    boxShadow: '8px 1px 6px 0 rgba(0, 0, 0, 0.2), inset 6px 0 8px 0 rgba(255, 255, 255, 0.08), inset -6px 0 8px 0 rgba(0, 0, 0, 0.6)',
  },
  cableVertical: {
    width: CABLE_WIDTH,
    height: CABLE_LENGTH,
    marginRight: 0,
    marginBottom: -PLUG_HEIGHT / 2,
  },
});
