/**
 * Patches RNSpotifyRemote.podspec to use SpotifyiOS.xcframework (arm64 for device)
 * instead of SpotifyiOS.framework (no arm64). Run after npm install.
 *
 * Root cause of "Undefined symbols for architecture arm64": CocoaPods adds
 * .../SpotifySDK (parent dir) to FRAMEWORK_SEARCH_PATHS first. That dir contains
 * BOTH the old SpotifyiOS.framework (no arm64) and SpotifyiOS.xcframework.
 * The linker finds the old .framework first and links it → missing arm64.
 * Fix: rename the old .framework so the linker only finds the xcframework slices.
 */
const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '../node_modules/@fkeulen/react-native-spotify-remote');
const podspecPath = path.join(packageRoot, 'RNSpotifyRemote.podspec');
const oldFrameworkPath = path.join(packageRoot, 'ios/external/SpotifySDK/SpotifyiOS.framework');
const oldFrameworkHidden = path.join(packageRoot, 'ios/external/SpotifySDK/SpotifyiOS.framework.no-arm64');

if (!fs.existsSync(podspecPath)) {
  process.exit(0);
}

// Hide the old .framework (no arm64) so the linker uses xcframework slices instead
if (fs.existsSync(oldFrameworkPath) && !fs.existsSync(oldFrameworkHidden)) {
  fs.renameSync(oldFrameworkPath, oldFrameworkHidden);
  console.log('Renamed SpotifyiOS.framework → SpotifyiOS.framework.no-arm64 (so linker uses xcframework)');
}

let content = fs.readFileSync(podspecPath, 'utf8');

const old = `  s.source_files  = "ios/*.{h,m}","ios/external/SpotifySDK/SpotifyiOS.framework/**/Headers/*.{h,m}"
  s.preserve_path = "ios/external/SpotifySDK/SpotifyiOS.framework"
  s.vendored_frameworks = "ios/external/SpotifySDK/SpotifyiOS.framework"`;

const newContent = `  s.source_files = "ios/*.{h,m}"
  s.vendored_frameworks = "ios/external/SpotifySDK/SpotifyiOS.xcframework"
  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_armv7/SpotifyiOS.framework/Headers" "$(PODS_TARGET_SRCROOT)/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator/SpotifyiOS.framework/Headers"'
  }
  s.user_target_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_armv7" "$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator"'
  }`;

const xcconfigBlock = `  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_armv7/SpotifyiOS.framework/Headers" "$(PODS_TARGET_SRCROOT)/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator/SpotifyiOS.framework/Headers"'
  }
  s.user_target_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_armv7" "$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator"'
  }`;

if (content.includes(old)) {
  content = content.replace(old, newContent);
  fs.writeFileSync(podspecPath, content);
  console.log('Patched RNSpotifyRemote.podspec to use SpotifyiOS.xcframework (arm64)');
} else if (content.includes('SpotifyiOS.xcframework') && !content.includes('user_target_xcconfig')) {
  const userTargetBlock = `  s.user_target_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_armv7" "$(PODS_ROOT)/../../node_modules/@fkeulen/react-native-spotify-remote/ios/external/SpotifySDK/SpotifyiOS.xcframework/ios-arm64_i386_x86_64-simulator"'
  }

  `;
  content = content.replace('  s.dependency \'React-Core\'', userTargetBlock + '  s.dependency \'React-Core\'');
  fs.writeFileSync(podspecPath, content);
  console.log('Patched RNSpotifyRemote.podspec: added user_target_xcconfig for framework search');
} else if (content.includes('user_target_xcconfig')) {
  // already fully patched
} else {
  console.warn('patch-spotify-podspec: podspec format changed, please update script');
}
