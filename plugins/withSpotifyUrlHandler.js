/**
 * Spotify iOS SDK requires AppDelegate to forward OAuth callbacks to RNSpotifyRemoteAuth.
 * Expo's template only forwards to RCTLinkingManager — without this, authorize() never completes.
 * @see https://github.com/cjam/react-native-spotify-remote#auth-callback
 */
const { withAppDelegate, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSpotifyUrlHandler(config) {
  return withAppDelegate(config, (config) => {
    const { modResults } = config;
    if (modResults.language !== 'swift') {
      return config;
    }

    const dir = path.dirname(modResults.path);
    const projectName = path.basename(dir);
    const bridgingPath = path.join(dir, `${projectName}-Bridging-Header.h`);
    const importLine = '#import <RNSpotifyRemote/RNSpotifyRemoteAuth.h>';

    if (fs.existsSync(bridgingPath)) {
      let bh = fs.readFileSync(bridgingPath, 'utf8');
      if (!bh.includes('RNSpotifyRemoteAuth')) {
        bh = `${bh.trimEnd()}\n\n${importLine}\n`;
        fs.writeFileSync(bridgingPath, bh);
      }
    }

    if (modResults.contents.includes('RNSpotifyRemoteAuth')) {
      return config;
    }

    const oldReturn =
      'return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)';
    if (!modResults.contents.includes(oldReturn)) {
      return config;
    }

    modResults.contents = modResults.contents.replace(
      oldReturn,
      [
        'if RNSpotifyRemoteAuth.sharedInstance().application(app, open: url, options: options) {',
        '      return true',
        '    }',
        `    ${oldReturn}`,
      ].join('\n'),
    );

    return config;
  });
}

module.exports = createRunOncePlugin(withSpotifyUrlHandler, 'with-spotify-url-handler');
