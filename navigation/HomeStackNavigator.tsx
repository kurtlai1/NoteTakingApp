import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  NoteDetail: {
    noteId?: number;
  };
  NoteEditor: {
    noteId?: number;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: 'Sparky Note Application',
        }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{ title: 'Note Details' }}
      />
      <Stack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ title: 'Note Editor' }}
      />
    </Stack.Navigator>
  );
}
