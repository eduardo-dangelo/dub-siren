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
  /** True when App Remote is connected but there is no current track (start playback in Spotify). */
  isConnectedAwaitingPlayback: boolean;
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

/**
 * True when the SDK error indicates Spotify app is definitively not installed.
 * Returns false for errors that can be false positives (e.g. "not installed" when
 * LSApplicationQueriesSchemes is missing) so the Connect button stays visible.
 */
function isSpotifyAppUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  // Never hide Connect for these—often false positives when config is wrong.
  if (
    lower.includes('connection refused') ||
    lower.includes('connection attempt failed') ||
    lower.includes('not installed') ||
    lower.includes('does not appear to be installed') ||
    // App Remote needs Spotify open; user can open it and retry — not "uninstalled".
    lower.includes('spotify is not running')
  ) {
    return false;
  }
  return (
    lower.includes('couldnotfindspotifyapp') ||
    lower.includes('could not find spotify')
  );
}

const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

const SPOTIFY_WEB_API = 'https://api.spotify.com/v1';

const APP_ACTIVE_WAIT_MS = 60_000;

/**
 * After OAuth, JS may resume while iOS is still inactive/background. App Remote
 * connect often fails unless the app is active (common on iPhone full-screen Safari).
 */
function waitForAppActive(timeoutMs = APP_ACTIVE_WAIT_MS): Promise<void> {
  if (AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.remove();
      reject(new Error('Timed out waiting for app to return to foreground'));
    }, timeoutMs);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      }
    });
  });
}

function isRecoverableAppRemoteError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('not running') ||
    lower.includes('connection refused') ||
    lower.includes('connection attempt failed') ||
    lower.includes('failed to connect') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('app remote')
  );
}

async function connectAppRemote(accessToken: string): Promise<void> {
  await waitForAppActive();
  try {
    await remote.connect(accessToken);
    return;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!NATIVE || !isRecoverableAppRemoteError(message)) {
      throw e;
    }
    try {
      await Linking.openURL('spotify://');
    } catch {
      // ignore openURL failures
    }
    await new Promise((r) => setTimeout(r, 800));
    await waitForAppActive();
    await remote.connect(accessToken);
  }
}

const GET_PLAYER_STATE_MS = 12_000;

function getPlayerStateWithTimeout(): Promise<PlayerState | null> {
  return Promise.race([
    remote.getPlayerState(),
    new Promise<PlayerState | null>((_, reject) =>
      setTimeout(() => reject(new Error('getPlayerState timed out')), GET_PLAYER_STATE_MS),
    ),
  ]).catch(() => null);
}

/** RN native rejects often include `code` + `message`; plain `Error` can lose the code. */
function formatUnknownError(e: unknown): string {
  if (typeof e === 'string' && e.length > 0) return e;
  if (e instanceof Error && e.message) {
    const withCode = e as Error & { code?: unknown };
    if (typeof withCode.code === 'string' && withCode.code.length > 0) {
      return `${withCode.code}: ${e.message}`;
    }
    return e.message;
  }
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const code = typeof o.code === 'string' ? o.code : '';
    const message = typeof o.message === 'string' ? o.message : '';
    if (code && message) return `${code}: ${message}`;
    if (message) return message;
    if (code) return code;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

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

  const isConnectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (!NATIVE || !isSpotifyConfigured) {
      setError('Spotify is not configured (set EXPO_PUBLIC_SPOTIFY_CLIENT_ID)');
      return;
    }
    if (!hasSpotifyApp) {
      return;
    }
    if (isConnectingRef.current) {
      return;
    }
    isConnectingRef.current = true;
    setError(null);
    setIsSpotifyAppUnavailable(false);
    setIsConnecting(true);
    let connectSucceeded = false;
    try {
      const session = await auth.authorize(spotifyConfig);
      await connectAppRemote(session.accessToken);
      setIsConnected(true);
      connectSucceeded = true;
    } catch (e) {
      const message = formatUnknownError(e);
      setError(message);
      setIsConnected(false);
      setPlayerState(null);
      if (isSpotifyAppUnavailableError(message)) {
        setIsSpotifyAppUnavailable(true);
      }
    } finally {
      // Clear "Connecting" as soon as auth + App Remote finish — do not await getPlayerState
      // here; it can hang on some devices and would leave the button stuck forever.
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
    if (connectSucceeded) {
      void (async () => {
        try {
          const state = await getPlayerStateWithTimeout();
          if (state) {
            setPlayerState(state);
            if (state.track) {
              setHasSeenPlayerState(true);
            }
          }
        } catch {
          // playerStateChanged listener may still deliver state
        }
      })();
    }
  }, [hasSpotifyApp]);

  const disconnect = useCallback(async () => {
    if (!NATIVE) return;
    isConnectingRef.current = false;
    setIsConnecting(false);
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
        // Detect whether the Spotify app is installed. On iOS without LSApplicationQueriesSchemes,
        // canOpenURL returns false even when Spotify is installed—we keep hasSpotifyApp true so
        // the auth popover (in-app browser) is used instead of opening the Spotify app.
        if (Platform.OS === 'android') {
          const canOpen = await Linking.canOpenURL('spotify://');
          if (cancelled) return;
          setHasSpotifyApp(canOpen);
          if (!canOpen) return;
        }

        // Try existing session first so the user doesn't have to tap Connect again.
        try {
          const existingSession: SpotifySession | undefined = await auth.getSession();
          if (!cancelled && existingSession && !existingSession.expired) {
            await connectAppRemote(existingSession.accessToken);
            if (cancelled) return;
            setIsConnected(true);
            void (async () => {
              try {
                const state = await getPlayerStateWithTimeout();
                if (cancelled || !state) return;
                setPlayerState(state);
                if (state.track) {
                  setHasSeenPlayerState(true);
                }
              } catch {
                // ignore
              }
            })();
            return;
          }
        } catch {
          // no existing session; fall back to connection check below
        }

        // Fallback: if the Remote is already connected, restore state.
        const connected = await remote.isConnectedAsync();
        if (!cancelled && connected) {
          setIsConnected(true);
          void (async () => {
            try {
              const state = await getPlayerStateWithTimeout();
              if (cancelled || !state) return;
              setPlayerState(state);
              if (state.track) {
                setHasSeenPlayerState(true);
              }
            } catch {
              // ignore
            }
          })();
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
      if (nextState === 'active') {
        setIsSpotifyAppUnavailable(false);
      }
      // Only disconnect when the app is fully backgrounded. iOS `inactive` fires for OAuth
      // sheets, Control Center, and other overlays — tearing down App Remote there breaks
      // iPhone connect flows. Skip while authorize/connect is in flight.
      const shouldDisconnect =
        !isConnectingRef.current &&
        appStateRef.current === 'active' &&
        nextState === 'background';
      if (shouldDisconnect) {
        void disconnect();
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
  const isConnectedAwaitingPlayback =
    NATIVE &&
    isSpotifyConfigured &&
    hasSpotifyApp &&
    isConnected &&
    !isConnecting &&
    !track;
  const hasPlayerContext = Boolean(track) || hasSeenPlayerState;

  return {
    visible: !!visible,
    isConnectedAwaitingPlayback,
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
