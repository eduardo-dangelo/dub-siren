import type { ApiConfig } from '@fkeulen/react-native-spotify-remote';
import { ApiScope } from '@fkeulen/react-native-spotify-remote';

/**
 * Spotify App Remote config.
 * Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID in .env or EAS/Expo config.
 * Optional: EXPO_PUBLIC_SPOTIFY_TOKEN_SWAP_URL, EXPO_PUBLIC_SPOTIFY_TOKEN_REFRESH_URL
 * for token swap/refresh (requires a backend).
 * Redirect URI must be registered in Spotify Dashboard (e.g. dubsiren://spotify-callback).
 */
const clientID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const redirectURL = 'dubsiren://spotify-callback';
const tokenSwapURL = process.env.EXPO_PUBLIC_SPOTIFY_TOKEN_SWAP_URL;
const tokenRefreshURL = process.env.EXPO_PUBLIC_SPOTIFY_TOKEN_REFRESH_URL;

export const spotifyConfig: ApiConfig = {
  clientID,
  redirectURL,
  ...(tokenSwapURL && { tokenSwapURL }),
  ...(tokenRefreshURL && { tokenRefreshURL }),
  scopes: [ApiScope.AppRemoteControlScope, ApiScope.UserReadPlaybackStateScope],
};

export const isSpotifyConfigured = Boolean(clientID);
