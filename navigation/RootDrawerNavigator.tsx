import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MainTabNavigator from './MainTabNavigator';

export type RootDrawerParamList = {
  MainTabs: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export default function RootDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: '#0f766e',
        drawerInactiveTintColor: '#64748b',
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          title: 'Notes App',
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="note-multiple-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
