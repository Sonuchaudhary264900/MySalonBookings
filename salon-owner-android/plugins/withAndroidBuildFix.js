const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidBuildFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.platformProjectRoot; // android/
      const projectRoot = path.join(root, '..'); // project root

      // 1. Fix root build.gradle: remove explicit Kotlin classpath to avoid
      //    version conflict with expo-root-project's bundled Kotlin version
      const rootBuildGradlePath = path.join(root, 'build.gradle');
      if (fs.existsSync(rootBuildGradlePath)) {
        let content = fs.readFileSync(rootBuildGradlePath, 'utf8');
        // Remove any explicit kotlin-gradle-plugin classpath line (let expo manage it)
        content = content.replace(
          /\n?\s*classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin[^)]*\)[^\n]*\n/g,
          '\n'
        );
        fs.writeFileSync(rootBuildGradlePath, content);
      }

      // 2. Fix gradle.properties: remove android.kotlinVersion (let expo manage it)
      const gradlePropertiesPath = path.join(root, 'gradle.properties');
      if (fs.existsSync(gradlePropertiesPath)) {
        let content = fs.readFileSync(gradlePropertiesPath, 'utf8');
        content = content.replace(/\nandroid\.kotlinVersion=.+/g, '');
        fs.writeFileSync(gradlePropertiesPath, content);
      }

      // 3. Fix app/build.gradle: remove enableBundleCompression (invalid in RN 0.81.5)
      const appBuildGradlePath = path.join(root, 'app', 'build.gradle');
      if (fs.existsSync(appBuildGradlePath)) {
        let content = fs.readFileSync(appBuildGradlePath, 'utf8');
        // Remove enableBundleCompression line if present
        content = content.replace(
          /\s*enableBundleCompression\s*=\s*\(findProperty\([^)]+\)[^)]*\)[^\n]*\n/g,
          '\n'
        );
        fs.writeFileSync(appBuildGradlePath, content);
      }

      return config;
    },
  ]);
};
