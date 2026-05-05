import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function FloatingActionButton() {
  const navigation = useNavigation();
  const pan = useRef(new Animated.ValueXY()).current;
  const [pressed, setPressed] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePress = () => {
    try {
      (navigation as any).navigate('MainTabs', {
        screen: 'Home',
        params: {
          screen: 'NoteEditor',
          params: {},
        },
      });
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        };
        setPressed(true);
      },
      onPanResponderMove: (evt, { dx, dy }) => {
        pan.x.setValue(startPos.current.x + dx);
        pan.y.setValue(startPos.current.y + dy);
      },
      onPanResponderRelease: (evt, { dx, dy }) => {
        setPressed(false);
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          handlePress();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed: isPressed }) => [
          styles.button,
          (isPressed || pressed) && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons
          name="note-edit-outline"
          color="#ffffff"
          size={28}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 76,
    right: 20,
    zIndex: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1e88e5',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pressed: {
    opacity: 0.85,
  },
});
