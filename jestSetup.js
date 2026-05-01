// Jest setup for React Native
require('react-native-gesture-handler/jestSetup');
// Mock reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
