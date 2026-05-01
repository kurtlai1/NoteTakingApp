import React from 'react';
import { Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeStackNavigator from './HomeStackNavigator';
import SearchScreen from '../screens/SearchScreen';
import TagsScreen from '../screens/TagsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MainTabParamList = {
  Home: {
    selectedTag?: string;
  };
  Search: undefined;
  Tags: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1e88e5',
        tabBarInactiveTintColor: '#64748b',
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Home' ? 'home-variant-outline' : 'tag-outline';

          return (
            <MaterialCommunityIcons name={iconName} color={color} size={size} />
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
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: '',
          tabBarItemStyle: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          },
          tabBarButton: props => {
            const { onPress, onLongPress } = props;
            return (
              <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  {
                    alignItems: 'center',
                    backgroundColor: '#1e88e5',
                    borderRadius: 999,
                    height: 68,
                    justifyContent: 'center',
                    marginTop: -26,
                    width: 68,
                  },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <MaterialCommunityIcons
                  name="note-edit-outline"
                  color="#ffffff"
                  size={34}
                />
              </Pressable>
            );
          },
          tabBarLabelStyle: { fontSize: 1 },
        }}
        listeners={({ navigation }) => ({
          tabPress: event => {
            event.preventDefault();
            (navigation as any).navigate('Home', {
              screen: 'NoteEditor',
            });
          },
        })}
      />
      <Tab.Screen name="Tags" component={TagsScreen} />
    </Tab.Navigator>
  );
}
