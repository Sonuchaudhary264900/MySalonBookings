const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Redirect react-native-reanimated to its mock so the broken native binary
// is never touched. The app uses React Native's built-in Animated API only.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated') {
    return {
      filePath: require.resolve('react-native-reanimated/mock'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
