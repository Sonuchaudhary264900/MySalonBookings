const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const REANIMATED_FIX = `
subprojects { subproject ->
    if (subproject.name == "react-native-reanimated") {
        subproject.afterEvaluate {
            subproject.android.externalNativeBuild.cmake.buildStagingDirectory =
                new File("C:/tmp/rn-reanimated-cxx")
        }
    }
}
`;

module.exports = function withLocalProperties(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.platformProjectRoot;

      // Create local.properties
      fs.writeFileSync(
        path.join(root, 'local.properties'),
        'sdk.dir=C:/Users/Dell/AppData/Local/Android/Sdk\n'
      );

      // Patch build.gradle with reanimated CMake staging fix
      const buildGradlePath = path.join(root, '..', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, 'utf8');
        if (!content.includes('react-native-reanimated')) {
          content = content.replace(
            'apply plugin: "com.facebook.react.rootproject"',
            'apply plugin: "com.facebook.react.rootproject"\n' + REANIMATED_FIX
          );
          fs.writeFileSync(buildGradlePath, content);
        }
      }

      return config;
    },
  ]);
};
