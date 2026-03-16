# Dub Siren – NJD Style
[🏠 Home Page](https://eduardo-dangelo.github.io/dub-siren/)


**Sound System Synth.** Analog sound system tones.


![Dub Siren pedal-style control panel](landing/assets/how-it-works-phone.png)


### **Classic dub siren controls.**

- **Authentic analog character** 
- **Four independent waveforms** 
- **Trigger & Hold**
- **Beat & Pitch control**
- **Global output control**
- **Siren & Tone**



### Getting started

To use Dub Siren localy - NJD Style, you'll need a React Native environment set up.  
See the official [React Native Getting Started guide](https://reactnative.dev/docs/environment-setup) for setup help.

### Spotify now playing (optional)

When music is playing in the Spotify app, you can connect and control it from Dub Siren (play/pause, previous, next, track info). This uses the Spotify App Remote SDK and requires a **development build** (e.g. `expo run:ios` / `expo run:android`); it does not work in Expo Go.

1. **Register an app** in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Note the **Client ID**.
2. **Add a redirect URI**: `dubsiren://spotify-callback` (Settings → Redirect URIs).
3. **Set the Client ID** in your environment:
   - Create a `.env` file in the project root with:
     ```bash
     EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
     ```
     `.env` is ignored by git; there is also a `.env.example` you can copy from on new machines.
   - Alternatively, you can still pass it when running: `EXPO_PUBLIC_SPOTIFY_CLIENT_ID=... npx expo start`.
4. Rebuild the app and open it (`npx expo run:ios` / `npx expo run:android`). A “Connect Spotify” control appears when configured; tap it to authorize with Spotify. Once connected, the now-playing bar shows the current track and transport controls.
5. **Token swap/refresh (optional):** For long-lived sessions you can run a small backend that implements [token swap and refresh](https://github.com/cjam/react-native-spotify-remote/tree/main/example-server). Set `EXPO_PUBLIC_SPOTIFY_TOKEN_SWAP_URL` and `EXPO_PUBLIC_SPOTIFY_TOKEN_REFRESH_URL` to your endpoints. Without them, auth uses the implicit flow (you may need to reconnect after some time).
