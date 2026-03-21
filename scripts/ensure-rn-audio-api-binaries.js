/**
 * react-native-audio-api does not ship FFmpeg XCFrameworks or iOS static libs on npm.
 * They are normally fetched by the Pod prepare_command during pod install; if that is skipped
 * or fails offline, `expo run:ios` dies in [CP] Copy XCFrameworks (rsync code 23).
 *
 * After npm install, ensure binaries exist by running the package's official download script.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const packageRoot = path.join(__dirname, '../node_modules/react-native-audio-api');
const marker = path.join(
  packageRoot,
  'common/cpp/audioapi/external/ffmpeg_ios/libavcodec.xcframework'
);

if (!fs.existsSync(path.join(packageRoot, 'scripts/download-prebuilt-binaries.sh'))) {
  process.exit(0);
}

if (fs.existsSync(marker)) {
  process.exit(0);
}

if (process.platform !== 'darwin') {
  console.warn(
    '[dub-siren] react-native-audio-api iOS binaries missing; skipped download (not macOS). ' +
      'iOS builds need: (cd node_modules/react-native-audio-api && ./scripts/download-prebuilt-binaries.sh ios)'
  );
  process.exit(0);
}

const result = spawnSync('bash', ['scripts/download-prebuilt-binaries.sh', 'ios'], {
  cwd: packageRoot,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error(
    '[dub-siren] Failed to download react-native-audio-api native binaries. Check network and retry npm install.'
  );
  process.exit(result.status ?? 1);
}

// Zip from GitHub can leave __MACOSX metadata next to xcframeworks and break CocoaPods rsync.
spawnSync('bash', [
  '-c',
  `find "${path.join(packageRoot, 'common/cpp/audioapi/external')}" -name '__MACOSX' -type d -prune -exec rm -rf {} + 2>/dev/null || true`,
]);

if (!fs.existsSync(marker)) {
  console.error('[dub-siren] Download finished but ffmpeg_ios XCFrameworks still missing.');
  process.exit(1);
}

console.log('[dub-siren] react-native-audio-api iOS/Android native binaries are present.');
