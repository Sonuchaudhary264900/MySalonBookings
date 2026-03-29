const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MAIN_APPLICATION_KT = `package com.mysalonbookings.owner

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    load()
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

module.exports = function withAndroidBuildFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.platformProjectRoot; // android/
      const projectRoot = path.join(root, '..'); // project root

      // 1. Fix root build.gradle: pin Kotlin classpath version to 2.1.0
      const rootBuildGradlePath = path.join(root, 'build.gradle');
      if (fs.existsSync(rootBuildGradlePath)) {
        let content = fs.readFileSync(rootBuildGradlePath, 'utf8');
        // Replace unversioned kotlin-gradle-plugin with versioned one
        content = content.replace(
          /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/g,
          "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0')"
        );
        // If it has a wrong version, fix it
        content = content.replace(
          /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:\d+\.\d+\.\d+['"]\)/g,
          "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0')"
        );
        fs.writeFileSync(rootBuildGradlePath, content);
      }

      // 2. Fix gradle.properties: ensure android.kotlinVersion=2.1.0 and newArchEnabled=true
      const gradlePropertiesPath = path.join(root, 'gradle.properties');
      if (fs.existsSync(gradlePropertiesPath)) {
        let content = fs.readFileSync(gradlePropertiesPath, 'utf8');
        if (!content.includes('android.kotlinVersion=')) {
          content += '\nandroid.kotlinVersion=2.1.0\n';
        } else {
          content = content.replace(
            /android\.kotlinVersion=.+/,
            'android.kotlinVersion=2.1.0'
          );
        }
        // Ensure new arch is enabled (required for Expo SDK 54 bridgeless runtime)
        content = content.replace(/newArchEnabled=false/, 'newArchEnabled=true');
        fs.writeFileSync(gradlePropertiesPath, content);
      }

      // 3. Fix app/build.gradle: remove enableBundleCompression (invalid in RN 0.76.9)
      //    and remove REACT_NATIVE_RELEASE_LEVEL buildConfigField (not used in our MainApplication)
      const appBuildGradlePath = path.join(root, 'app', 'build.gradle');
      if (fs.existsSync(appBuildGradlePath)) {
        let content = fs.readFileSync(appBuildGradlePath, 'utf8');
        // Remove enableBundleCompression line if present
        content = content.replace(
          /\s*enableBundleCompression\s*=\s*\(findProperty\([^)]+\)[^)]*\)[^\n]*\n/g,
          '\n'
        );
        // Remove REACT_NATIVE_RELEASE_LEVEL buildConfigField if present
        content = content.replace(
          /\s*buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n/g,
          '\n'
        );
        fs.writeFileSync(appBuildGradlePath, content);
      }

      // 4. Fix MainApplication.kt: replace with RN 0.76.9 compatible version
      const mainAppPath = path.join(
        root,
        'app', 'src', 'main', 'java',
        'com', 'mysalonbookings', 'owner',
        'MainApplication.kt'
      );
      if (fs.existsSync(mainAppPath)) {
        const current = fs.readFileSync(mainAppPath, 'utf8');
        // Only rewrite if it contains RN 0.77+ APIs that don't exist in 0.76.9
        if (
          current.includes('loadReactNative') ||
          current.includes('ReleaseLevel') ||
          current.includes('ReactNativeApplicationEntryPoint')
        ) {
          fs.writeFileSync(mainAppPath, MAIN_APPLICATION_KT);
        }
      }

      return config;
    },
  ]);
};
