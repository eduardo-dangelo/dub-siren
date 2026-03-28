/**
 * Strips bitcode from SpotifyiOS.framework/SpotifyiOS shipped inside the
 * RN Spotify Remote dependency.
 *
 * Reason: App Store Connect rejects archives that embed bitcode in
 * frameworks (error: Invalid Executable / SpotifyiOS contains bitcode).
 *
 * We strip bitcode in-place in node_modules so when Xcode embeds the
 * framework, the resulting archived binary is already clean.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function listDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

function stripBitcodeInFile(inputPath) {
  if (!isFile(inputPath)) return false;

  const tmpOut = path.join('/tmp', `SpotifyiOS.bitcode-stripped.${process.pid}.${Date.now()}`);
  const result = spawnSync('xcrun', ['bitcode_strip', inputPath, '-r', '-o', tmpOut], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    // If bitcode_strip fails for non-bitcode reasons, we surface stdout/stderr to help debug.
    const msg = `bitcode_strip failed for ${inputPath}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    throw new Error(msg);
  }

  fs.copyFileSync(tmpOut, inputPath);
  try {
    fs.unlinkSync(tmpOut);
  } catch {
    // ignore cleanup
  }
  return true;
}

function findSpotifyBinaries(xcframeworkRoot) {
  // Typical structure:
  // .../SpotifyiOS.xcframework/ios-arm64_armv7/SpotifyiOS.framework/SpotifyiOS
  // .../SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator/SpotifyiOS.framework/SpotifyiOS
  const binaries = [];
  const outerSlices = listDirs(xcframeworkRoot);
  for (const slice of outerSlices) {
    const maybeFramework = path.join(xcframeworkRoot, slice, 'SpotifyiOS.framework');
    const binPath = path.join(maybeFramework, 'SpotifyiOS');
    if (isFile(binPath)) binaries.push(binPath);
  }
  return binaries;
}

function main() {
  if (process.platform !== 'darwin') {
    console.log('[strip-spotify-bitcode] Not macOS; skipping.');
    return;
  }

  const packageRoot = path.join(__dirname, '../node_modules/@fkeulen/react-native-spotify-remote');
  const xcframeworkRoot = path.join(
    packageRoot,
    'ios/external/SpotifySDK/SpotifyiOS.xcframework',
  );

  if (!fs.existsSync(xcframeworkRoot)) {
    console.log('[strip-spotify-bitcode] SpotifyiOS.xcframework not found; skipping.');
    return;
  }

  const binaries = findSpotifyBinaries(xcframeworkRoot);
  if (binaries.length === 0) {
    console.log('[strip-spotify-bitcode] No SpotifyiOS.framework binaries found; nothing to do.');
    return;
  }

  let strippedCount = 0;
  for (const bin of binaries) {
    console.log(`[strip-spotify-bitcode] Stripping: ${bin}`);
    stripBitcodeInFile(bin);
    strippedCount += 1;
  }

  console.log(`[strip-spotify-bitcode] Done. Stripped ${strippedCount} binary(s).`);
}

main();

