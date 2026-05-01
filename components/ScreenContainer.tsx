import React, { type PropsWithChildren } from 'react';
import {
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
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 4,

  },
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingLeft: 16,
    paddingRight: 16,
  },
});
