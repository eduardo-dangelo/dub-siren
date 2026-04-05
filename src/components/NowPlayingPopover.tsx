import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pedalColors } from '../theme/pedalColors';
import type { NowPlayingTrack, UseSpotifyPlaybackResult } from '../hooks/useSpotifyPlayback';

/** Set inner value to `true` in dev to preview the now-playing bar without Spotify. */
const USE_MOCK_NOW_PLAYING = __DEV__ && false;

const MOCK_TRACK: NowPlayingTrack = {
  name: 'Chase the Devil',
  artist: 'Max Romeo',
  album: 'War Ina Babylon',
  imageUri: null,
};

interface NowPlayingBarProps {
  track: NowPlayingTrack;
  isPlaying: boolean;
  animatedBarStyle: { transform: { scaleX: Animated.Value }[] };
  onPrevious: () => void;
  onNext: () => void;
  play: () => void;
  pause: () => void;
}

function NowPlayingBar({
  track,
  isPlaying,
  animatedBarStyle,
  onPrevious,
  onNext,
  play,
  pause,
}: NowPlayingBarProps) {
  return (
    <Animated.View style={[styles.bar, animatedBarStyle]}>
      <View style={styles.artwork}>
        {track.imageUri ? (
          <Image source={{ uri: track.imageUri }} style={styles.artworkImage} resizeMode="cover" />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <Image
              source={require('../../assets/spotify-logo.png')}
              style={styles.spotifyLogoLarge}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist || track.album || 'Spotify'}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={styles.controlButton}
          onPress={onPrevious}
          accessibilityLabel="Previous track"
        >
          <Ionicons name="play-skip-back" size={22} color={pedalColors.toggleChrome} />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={isPlaying ? pause : play}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color={pedalColors.toggleChrome}
          />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={onNext}
          accessibilityLabel="Next track"
        >
          <Ionicons name="play-skip-forward" size={22} color={pedalColors.toggleChrome} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

interface NowPlayingPopoverProps {
  spotify: UseSpotifyPlaybackResult;
}

export function NowPlayingPopover({ spotify }: NowPlayingPopoverProps) {
  const {
    visible,
    isConnectedAwaitingPlayback,
    track,
    isPlaying,
    isConnecting,
    isConnected,
    hasSpotifyApp,
    hasPlayerContext,
    hasSeenPlayerState,
    isSpotifyConfigured,
    isSpotifyAppUnavailable,
    error,
    connect,
    play,
    pause,
    next,
    previous,
  } = spotify;

  const [mockIsPlaying, setMockIsPlaying] = useState(true);

  const canConnect =
    hasSpotifyApp && isSpotifyConfigured && !isConnected && !isSpotifyAppUnavailable;
  const showConnectPrompt =
    canConnect && (!hasPlayerContext || hasSeenPlayerState);
  

  const showConfigBar = !isSpotifyConfigured;
  const showErrorBar = error != null && !showConnectPrompt;
  const showConnectedAwaitingBar =
    isConnectedAwaitingPlayback && error == null && !showConnectPrompt;
  const showNowPlayingBar = visible && !!track;
  const anyBarVisible = USE_MOCK_NOW_PLAYING
    ? true
    : showConfigBar ||
      showConnectPrompt ||
      showErrorBar ||
      showConnectedAwaitingBar ||
      showNowPlayingBar;

  const scaleX = useRef(
    new Animated.Value(anyBarVisible ? 1 : 0),
  ).current;

  useEffect(() => {
    const toValue = anyBarVisible ? 1 : 0;
    const duration = anyBarVisible ? 180 : 140;
    const easing = anyBarVisible ? Easing.out(Easing.ease) : Easing.in(Easing.ease);
    Animated.timing(scaleX, {
      toValue,
      duration,
      easing,
      useNativeDriver: true,
    }).start();
  }, [anyBarVisible, scaleX]);

  const animatedBarStyle = {
    transform: [{ scaleX }],
  };

  if (USE_MOCK_NOW_PLAYING) {
    return (
      <View style={styles.container} pointerEvents="box-none">
        <NowPlayingBar
          track={MOCK_TRACK}
          isPlaying={mockIsPlaying}
          animatedBarStyle={animatedBarStyle}
          onPrevious={() => {}}
          onNext={() => {}}
          play={() => setMockIsPlaying(true)}
          pause={() => setMockIsPlaying(false)}
        />
      </View>
    );
  }

  // If the Spotify app is not installed/available, hide the popover entirely.
  if (!hasSpotifyApp) {
    return null;
  }

  if (
    !visible &&
    !error &&
    !showConnectPrompt &&
    !isSpotifyConfigured &&
    !showConnectedAwaitingBar
  ) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {!isSpotifyConfigured && (
        <Animated.View style={[styles.bar, animatedBarStyle]}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={pedalColors.toggleChrome}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.configText} numberOfLines={2}>
            Spotify controls are not configured. Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID and rebuild.
          </Text>
        </Animated.View>
      )}

         
        

      {showConnectPrompt && (
        <Animated.View style={[styles.connectButton, animatedBarStyle, { width: isConnecting ? 125 : 100 }]}>
          <Pressable
            style={styles.connectButtonInner}
            onPress={connect}
            accessibilityLabel="Connect Spotify"
          >
            <Image
              source={require('../../assets/spotify-logo.png')}
              style={styles.spotifyLogoSmall}
              resizeMode="contain"
            />
              <Text style={styles.connectLabel}>{`${isConnecting ? 'Connecting...' : 'Connect'}`}</Text>
          </Pressable>
        </Animated.View>
      )}

      {error != null && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} numberOfLines={5}>
            {error}
          </Text>
        </View>
      )}

      {showConnectedAwaitingBar && (
        <Animated.View style={[styles.bar, animatedBarStyle]}>
          <Image
            source={require('../../assets/spotify-logo.png')}
            style={styles.spotifyLogoSmall}
            resizeMode="contain"
          />
          <View style={styles.awaitingTextWrap}>
            <Text style={styles.awaitingTitle} numberOfLines={1}>
              Connected to Spotify
            </Text>
            <Text style={styles.awaitingHint} numberOfLines={2}>
              Start playback in the Spotify app — the track will appear here.
            </Text>
          </View>
        </Animated.View>
      )}

      {visible && track && (
        <NowPlayingBar
          track={track}
          isPlaying={isPlaying}
          animatedBarStyle={animatedBarStyle}
          onPrevious={previous}
          onNext={next}
          play={play}
          pause={pause}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9,
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 1,
    },
  bar: {
    
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    maxWidth: '100%',
    
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: pedalColors.enclosureDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyLogoSmall: {
    width: 18,
    height: 18,
    opacity: 0.6,
  },
  spotifyLogoLarge: {
    width: 24,
    height: 24,
    tintColor: pedalColors.enclosureLight,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: pedalColors.indicatorWhite,
  },
  artist: {
    fontSize: 11,
    color: pedalColors.toggleChrome,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 8,
  },
  connectButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  connectLabel: {
    fontSize: 12,
    color: pedalColors.toggleChrome,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  errorText: {
    fontSize: 11,
    color: 'rgba(113, 0, 0, 0.8)',
    flex: 1,
    textAlign: 'center',
  },
  configText: {
    fontSize: 11,
    color: pedalColors.toggleChrome,
    flex: 1,
  },
  awaitingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  awaitingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: pedalColors.indicatorWhite,
  },
  awaitingHint: {
    fontSize: 10,
    color: pedalColors.toggleChrome,
    marginTop: 2,
  },
  connectingText: {
    fontSize: 12,
    color: pedalColors.toggleChrome,
  },
});
