import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeStackNavigator from './HomeStackNavigator';
import TagsScreen from '../screens/TagsScreen';
import FloatingActionButton from '../components/FloatingActionButton';

export type MainTabParamList = {
  Home: {
    selectedTag?: string;
  };
  Tags: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1e88e5',
          tabBarInactiveTintColor: '#64748b',
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === 'Home' ? 'home-variant-outline' : 'tag-outline';

            return (
              <MaterialCommunityIcons
                name={iconName}
                color={color}
                size={size}
              />
            );
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
          tabBarStyle: {
            height: 60,
            paddingBottom: 4,
            paddingTop: 8,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            headerShown: false,
          }}
          listeners={({ navigation, route }) => ({
            tabPress: e => {
              // Allow default behavior
            },
          })}
        />
        <Tab.Screen name="Tags" component={TagsScreen} />
      </Tab.Navigator>
      <FloatingActionButton />
    </View>
  );
}
