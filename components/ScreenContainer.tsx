import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenContainerProps = PropsWithChildren<{
  scrollable?: boolean;
}>;

export default function ScreenContainer({
  children,
  scrollable = false,
}: ScreenContainerProps) {
  const content = scrollable ? (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
    paddingBottom: 4,
  },
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
