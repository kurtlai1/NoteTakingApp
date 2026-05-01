module.exports = {
  preset: 'react-native',
  // Transform ESM packages used by React Navigation so Jest can parse them
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-drawer-layout|@react-navigation|@react-navigation/.*)/)',
  ],
  moduleNameMapper: {
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  setupFiles: ['<rootDir>/jestSetup.js'],
};
