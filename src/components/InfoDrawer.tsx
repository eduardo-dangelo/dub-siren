import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { pedalColors } from '../theme/pedalColors';
import { Ionicons } from '@expo/vector-icons';
interface InfoDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 380;

export function InfoDrawer({ visible, onClose }: InfoDrawerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);

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
          resizeMode="stretch"
          style={styles.drawerBackground}
          imageStyle={styles.drawerImage}
        >
          <View style={styles.drawerOverlay} pointerEvents="none" />
          <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={18} color={pedalColors.labelText} style={{ marginRight: 8 }} />
            <Text style={styles.title}>HOW TO USE</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Turn <Text style={{ fontWeight: '500' }}>TRIGGER</Text> or press <Text style={{ fontWeight: '500' }}>HOLD</Text> to start the beat. Use the knobs to set <Text style={{ fontWeight: '500' }}>PITCH</Text>, <Text style={{ fontWeight: '500' }}>MODE</Text>, <Text style={{ fontWeight: '500' }}>BEAT</Text>, and <Text style={{ fontWeight: '500' }}>VOLUME</Text>.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: '500' }}>SIREN</Text> and <Text style={{ fontWeight: '500' }}>TONE</Text> only work when <Text style={{ fontWeight: '500' }}>BEAT</Text> is on position 4. For <Text style={{ fontWeight: '500' }}>DELAY</Text> open Settings on the top right.
          </Text>
        </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

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
    opacity: 0.7,
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
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: pedalColors.labelText,
    letterSpacing: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  paragraph: {
    fontSize: 14,
    color: pedalColors.labelText,
    lineHeight: 22,
    marginBottom: 14,
  },
});
