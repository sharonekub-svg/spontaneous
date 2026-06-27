module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Path aliases (@/*) are resolved by Expo's Metro config from tsconfig.json.
    // react-native-reanimated/plugin must always be listed last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
