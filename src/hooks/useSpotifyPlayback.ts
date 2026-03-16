import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { auth, remote } from '@fkeulen/react-native-spotify-remote';
import type { PlayerState, SpotifySession } from '@fkeulen/react-native-spotify-remote';
import { isSpotifyConfigured, spotifyConfig } from '../config/spotify';

export interface NowPlayingTrack {
  name: string;
  artist: string;
  album: string;
  imageUri: string | null;
}

export interface UseSpotifyPlaybackResult {
  visible: boolean;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  hasSpotifyApp: boolean;
  hasPlayerContext: boolean;
  hasSeenPlayerState: boolean;
  isSpotifyConfigured: boolean;
  isSpotifyAppUnavailable: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
}

/** True when the SDK error indicates Spotify app is not running / not findable. */
function isSpotifyAppUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('couldnotfindspotifyapp') ||
    lower.includes('could not find spotify') ||
    lower.includes('spotify app not') ||
    lower.includes('spotify is not running')
  );
}

const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

const SPOTIFY_WEB_API = 'https://api.spotify.com/v1';

function normalizeImageUri(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (raw && typeof raw === 'object' && 'uri' in raw) {
    const uri = (raw as { uri?: string }).uri;
    return typeof uri === 'string' && uri.length > 0 ? uri : null;
  }
  return null;
}

/** Extract Spotify track ID from uri (e.g. "spotify:track:xxx" -> "xxx"). */
function trackIdFromUri(uri: string): string | null {
  const prefix = 'spotify:track:';
  return uri.startsWith(prefix) ? uri.slice(prefix.length) : null;
}

/** Fetch album image URL for a track using Spotify Web API. */
async function fetchTrackImageUrl(
  trackUri: string,
  accessToken: string,
): Promise<string | null> {
  const id = trackIdFromUri(trackUri);
  if (!id) return null;
  const res = await fetch(`${SPOTIFY_WEB_API}/tracks/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    album?: { images?: Array<{ url: string }> };
  };
  const url = data?.album?.images?.[0]?.url;
  return typeof url === 'string' ? url : null;
}

function playerStateToTrack(state: PlayerState | null): NowPlayingTrack | null {
  if (!state?.track) return null;
  const { track } = state;
  const artistName = track.artist?.name ?? '';
  const albumName = track.album?.name ?? '';
  const trackImage = normalizeImageUri((track as { imageUri?: unknown }).imageUri);
  const albumImage =
    track.album && 'imageUri' in track.album
      ? normalizeImageUri((track.album as { imageUri?: unknown }).imageUri)
      : null;
  const imageUri = trackImage ?? albumImage ?? null;
  return {
    name: track.name,
    artist: artistName,
    album: albumName,
    imageUri,
  };
}

export function useSpotifyPlayback(): UseSpotifyPlaybackResult {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasSpotifyApp, setHasSpotifyApp] = useState(true);
  const [hasSeenPlayerState, setHasSeenPlayerState] = useState(false);
  const [isSpotifyAppUnavailable, setIsSpotifyAppUnavailable] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const connect = useCallback(async () => {
    if (!NATIVE || !isSpotifyConfigured) {
      setError('Spotify is not configured (set EXPO_PUBLIC_SPOTIFY_CLIENT_ID)');
      return;
    }
    if (!hasSpotifyApp) {
      // Spotify app is not installed or unavailable; silently bail.
      return;
    }
    setError(null);
    setIsConnecting(true);
    try {
      const session = await auth.authorize(spotifyConfig);
      await remote.connect(session.accessToken);
      setIsConnected(true);
      const state = await remote.getPlayerState();
      setPlayerState(state);
      if (state?.track) {
        setHasSeenPlayerState(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setIsConnected(false);
      setPlayerState(null);
      if (isSpotifyAppUnavailableError(message)) {
        setIsSpotifyAppUnavailable(true);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!NATIVE) return;
    try {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      await remote.disconnect();
    } catch {
      // ignore
    }
    setIsConnected(false);
    setPlayerState(null);
  }, []);

  useEffect(() => {
    if (!NATIVE || !isConnected) return;

    const onState = (state: PlayerState) => {
      setPlayerState(state);
      if (state?.track) {
        setHasSeenPlayerState(true);
      }
    };
    const onDisconnected = () => {
      setIsConnected(false);
      setPlayerState(null);
    };

    remote.addListener('playerStateChanged', onState);
    remote.addListener('remoteDisconnected', onDisconnected);
    subscriptionRef.current = {
      remove: () => {
        remote.removeListener('playerStateChanged', onState);
        remote.removeListener('remoteDisconnected', onDisconnected);
      },
    };

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isConnected]);

  // Fetch album art from Spotify Web API when native layer doesn't provide it
  useEffect(() => {
    if (!NATIVE || !playerState?.track) return;
    const trackUri = (playerState.track as { uri?: string }).uri;
    if (!trackUri) return;
    const baseTrack = playerStateToTrack(playerState);
    if (baseTrack?.imageUri || imageCache[trackUri]) return;

    let cancelled = false;
    (async () => {
      try {
        const session = await auth.getSession();
        if (cancelled || !session?.accessToken || session.expired) return;
        const url = await fetchTrackImageUrl(trackUri, session.accessToken);
        if (cancelled || !url) return;
        setImageCache((prev) => ({ ...prev, [trackUri]: url }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerState?.track ? (playerState.track as { uri?: string }).uri : null]);

  useEffect(() => {
    if (!NATIVE || !isSpotifyConfigured) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        // Detect whether the Spotify app is installed (covers the \"no app\" case).
        const canOpen = await Linking.canOpenURL('spotify://');
        if (cancelled) return;
        setHasSpotifyApp(canOpen);
        if (!canOpen) {
          return;
        }

        // Try existing session first so the user doesn't have to tap Connect again.
        try {
          const existingSession: SpotifySession | undefined = await auth.getSession();
          if (!cancelled && existingSession && !existingSession.expired) {
            await remote.connect(existingSession.accessToken);
            if (cancelled) return;
            setIsConnected(true);
            const state = await remote.getPlayerState();
            setPlayerState(state);
            if (state?.track) {
              setHasSeenPlayerState(true);
            }
            return;
          }
        } catch {
          // no existing session; fall back to connection check below
        }

        // Fallback: if the Remote is already connected, restore state.
        const connected = await remote.isConnectedAsync();
        if (!cancelled && connected) {
          setIsConnected(true);
          const state = await remote.getPlayerState();
          setPlayerState(state);
          if (state?.track) {
            setHasSeenPlayerState(true);
          }
        }
      } catch {
        // ignore bootstrap errors
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!NATIVE) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextState !== 'active') {
        void disconnect();
      }
      if (nextState === 'active') {
        setIsSpotifyAppUnavailable(false);
      }
      appStateRef.current = nextState;
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [disconnect]);

  const play = useCallback(async () => {
    if (!NATIVE || !isConnected) return;
    try {
      await remote.resume();
    } catch {
      // ignore
    }
  }, [isConnected]);

  const pause = useCallback(async () => {
    if (!NATIVE || !isConnected) return;
    try {
      await remote.pause();
    } catch {
      // ignore
    }
  }, [isConnected]);

  const next = useCallback(async () => {
    if (!NATIVE || !isConnected) return;
    try {
      await remote.skipToNext();
    } catch {
      // ignore
    }
  }, [isConnected]);

  const previous = useCallback(async () => {
    if (!NATIVE || !isConnected) return;
    try {
      await remote.skipToPrevious();
    } catch {
      // ignore
    }
  }, [isConnected]);

  const baseTrack = playerStateToTrack(playerState);
  const trackUri = playerState?.track
    ? (playerState.track as { uri?: string }).uri
    : null;
  const resolvedImageUri = trackUri ? imageCache[trackUri] ?? null : null;
  const track: NowPlayingTrack | null = baseTrack
    ? {
        ...baseTrack,
        imageUri: baseTrack.imageUri ?? resolvedImageUri ?? null,
      }
    : null;
  const visible =
    NATIVE &&
    isSpotifyConfigured &&
    hasSpotifyApp &&
    (isConnected || hasSeenPlayerState) &&
    Boolean(track) &&
    !isConnecting;
  const hasPlayerContext = Boolean(track) || hasSeenPlayerState;

  return {
    visible: !!visible,
    track,
    isPlaying: playerState ? !playerState.isPaused : false,
    isConnecting,
    isConnected,
    hasSpotifyApp,
    hasPlayerContext,
    hasSeenPlayerState,
    isSpotifyConfigured: NATIVE && isSpotifyConfigured,
    isSpotifyAppUnavailable,
    error,
    connect,
    disconnect,
    play,
    pause,
    next,
    previous,
  };
}
