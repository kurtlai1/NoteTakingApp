import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  createDrawerNavigator,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MainTabNavigator from './MainTabNavigator';
import FavoritesScreen from '../screens/FavoritesScreen';
import RecycleBinScreen from '../screens/RecycleBinScreen';
import { getAllNotes, getDrawerStats } from '../database/database';

export type RootDrawerParamList = {
  MainTabs: undefined;
  Favorites: undefined;
  RecycleBin: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

type DrawerStats = {
  allNotes: number;
  favorites: number;
  recycleBin: number;
  folders: number;
};

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const drawerStatus = useDrawerStatus();
  const [stats, setStats] = useState<DrawerStats>({
    allNotes: 0,
    favorites: 0,
    recycleBin: 0,
    folders: 0,
  });
  const [folders, setFolders] = useState<string[]>([]);

  const loadDrawerData = useCallback(async () => {
    try {
      const [drawerStats, allNotes] = await Promise.all([
        getDrawerStats(),
        getAllNotes(),
      ]);

      const folderSet = new Set<string>();
      (allNotes as Array<{ tags: string }>).forEach(note => {
        parseTags(note.tags).forEach(tag => folderSet.add(tag));
      });

      setStats(drawerStats as DrawerStats);
      setFolders(Array.from(folderSet).sort((left, right) => left.localeCompare(right)));
    } catch {
      setStats({ allNotes: 0, favorites: 0, recycleBin: 0, folders: 0 });
      setFolders([]);
    }
  }, []);

  useEffect(() => {
    loadDrawerData();
  }, [loadDrawerData, drawerStatus]);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <Pressable
        style={styles.drawerRow}
        onPress={() => props.navigation.navigate('MainTabs', { screen: 'Home' })}
      >
        <View style={styles.drawerRowLeft}>
          <MaterialCommunityIcons name="note-multiple-outline" color="#111827" size={22} />
          <Text style={styles.drawerLabel}>All notes</Text>
        </View>
        <Text style={styles.drawerCount}>{stats.allNotes}</Text>
      </Pressable>

      <Pressable
        style={styles.drawerRow}
        onPress={() => props.navigation.navigate('Favorites')}
      >
        <View style={styles.drawerRowLeft}>
          <MaterialCommunityIcons name="star-outline" color="#111827" size={22} />
          <Text style={styles.drawerLabel}>Favorites</Text>
        </View>
        <Text style={styles.drawerCount}>{stats.favorites}</Text>
      </Pressable>

      <Pressable
        style={styles.drawerRow}
        onPress={() => props.navigation.navigate('RecycleBin')}
      >
        <View style={styles.drawerRowLeft}>
          <MaterialCommunityIcons name="delete-outline" color="#111827" size={22} />
          <Text style={styles.drawerLabel}>Recycle bin</Text>
        </View>
        <Text style={styles.drawerCount}>{stats.recycleBin}</Text>
      </Pressable>

      <Text style={styles.dottedLine}>............................</Text>

      <Pressable
        style={[styles.drawerRow, styles.folderHeaderRow]}
        onPress={() => props.navigation.navigate('MainTabs', { screen: 'Folders' })}
      >
        <View style={styles.drawerRowLeft}>
          <MaterialCommunityIcons name="folder-outline" color="#111827" size={22} />
          <Text style={styles.drawerLabel}>Folders</Text>
        </View>
        <Text style={styles.drawerCount}>{stats.folders}</Text>
      </Pressable>

      <View style={styles.folderList}>
        {folders.map(folder => (
          <View key={folder} style={styles.folderItem}>
            <MaterialCommunityIcons name="folder-outline" color="#1f2937" size={18} />
            <Text style={styles.folderItemText} numberOfLines={1}>{folder}</Text>
          </View>
        ))}
      </View>
    </DrawerContentScrollView>
  );
}

export default function RootDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: '#0f766e',
        drawerInactiveTintColor: '#64748b',
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          title: 'All notes',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="note-multiple-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="star-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="RecycleBin"
        component={RecycleBinScreen}
        options={{
          title: 'Recycle bin',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="delete-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  dottedLine: {
    color: '#475569',
    fontSize: 20,
    letterSpacing: 6,
    marginBottom: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  drawerContent: {
    paddingHorizontal: 14,
    paddingTop: 60,
  },
  drawerCount: {
    color: '#4b5563',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 14,
  },
  drawerLabel: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '700',
    marginLeft: 15,
  },
  drawerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  drawerRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  folderHeaderRow: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  folderItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  folderItemText: {
    color: '#111827',
    flex: 1,
    fontSize: 18,
    marginLeft: 8,
  },
  folderList: {
    marginTop: 6,
  },
});
