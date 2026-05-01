import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import NoteCard from '../components/NoteCard';
import ScreenContainer from '../components/ScreenContainer';
import {
  getAllNotes,
  getTagsSummary,
  TagColorKey,
  TAG_COLOR_OPTIONS,
} from '../database/database';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

type HomeNote = {
  id: number;
  title: string;
  body: string;
  tags: string;
  is_favorite: number;
  deleted_at: string | null;
  updated_at: string;
};

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'title', label: 'Title' },
];

export default function HomeScreen({ route, navigation }: Props) {
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [selectedTag, setSelectedTag] = useState(
    route.params?.selectedTag || '',
  );
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'title'>(
    'newest',
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [tagsSummary, setTagsSummary] = useState<
    Array<{
      tag: string;
      count: number;
      latest: string;
      colorKey: TagColorKey | null;
    }>
  >([]);
  const parentNavigation = useNavigation();

  // Update selected tag when route params change
  useFocusEffect(
    useCallback(() => {
      const tag = route.params?.selectedTag || '';
      console.log(
        'HomeScreen focus - route.params:',
        route.params,
        'tag:',
        tag,
      );
      setSelectedTag(tag);
    }, [route.params?.selectedTag]),
  );

  const loadNotes = useCallback(async () => {
    try {
      const result = await getAllNotes();
      setNotes(result as HomeNote[]);
    } catch {
      setNotes([]);
    }
  }, []);

  const loadTagsSummary = useCallback(async () => {
    try {
      const result = await getTagsSummary();
      setTagsSummary(result);
    } catch {
      setTagsSummary([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadTagsSummary();
    }, [loadNotes, loadTagsSummary]),
  );

  const tags = useMemo(() => {
    const allTags = notes.flatMap(note => parseTags(note.tags));
    const uniqueTags = Array.from(new Set(allTags));

    // Sort by most recent creation date (newest first)
    return uniqueTags.sort((left, right) => {
      const leftNotes = notes.filter(note =>
        parseTags(note.tags).includes(left),
      );
      const rightNotes = notes.filter(note =>
        parseTags(note.tags).includes(right),
      );

      const leftDate =
        leftNotes.length > 0 ? new Date(leftNotes[0].updated_at).getTime() : 0;
      const rightDate =
        rightNotes.length > 0
          ? new Date(rightNotes[0].updated_at).getTime()
          : 0;

      return rightDate - leftDate; // newest first
    });
  }, [notes]);

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsSummary.forEach(summary => {
      if (summary.colorKey) {
        map[summary.tag] = summary.colorKey;
      }
    });
    return map;
  }, [tagsSummary]);

  const getTagColor = (tag: string): string => {
    const colorKey = tagColorMap[tag];
    if (!colorKey) return '#eef6ff';
    const colorOption = TAG_COLOR_OPTIONS.find(opt => opt.key === colorKey);
    return colorOption ? colorOption.color : '#eef6ff';
  };

  const filteredNotes = useMemo(() => {
    console.log(
      'Computing filteredNotes - selectedTag:',
      selectedTag,
      'total notes:',
      notes.length,
    );
    const filtered = selectedTag
      ? notes.filter(note => parseTags(note.tags).includes(selectedTag))
      : notes;
    console.log('Filtered notes count:', filtered.length);

    return [...filtered].sort((left, right) => {
      if (sortOption === 'title') {
        return left.title.localeCompare(right.title);
      }

      const leftDate = new Date(left.updated_at).getTime();
      const rightDate = new Date(right.updated_at).getTime();

      return sortOption === 'oldest'
        ? leftDate - rightDate
        : rightDate - leftDate;
    });
  }, [notes, selectedTag, sortOption]);

  return (
    <ScreenContainer>
      <View style={styles.headerSection}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => (parentNavigation as any).openDrawer()}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.statsText}>
              {tags.length} tags · {filteredNotes.length} notes
            </Text>
          </View>
          <View style={styles.headerIconsRow}>
            <TouchableOpacity
              onPress={() => (parentNavigation as any).navigate('Search')}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color="#334155"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSortMenu(!showSortMenu)}
              style={styles.iconButton}
            >
              <Text style={styles.headerIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showSortMenu && (
          <>
            <Pressable
              style={styles.sortMenuOverlay}
              onPress={() => setShowSortMenu(false)}
            />
            <View style={styles.sortOverflowMenu}>
              {SORT_OPTIONS.map(option => (
                <Pressable
                  key={option.key}
                  style={styles.sortOverflowOption}
                  onPress={() => {
                    setSortOption(option.key as 'newest' | 'oldest' | 'title');
                    setShowSortMenu(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOverflowText,
                      sortOption === option.key &&
                        styles.sortOverflowTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.tagSection}>
          <Text style={styles.sectionHeading}>Tags</Text>
          <View style={styles.tagRow}>
            <TouchableOpacity
              style={[styles.tagPill, !selectedTag && styles.tagPillActive]}
              onPress={() => setSelectedTag('')}
            >
              <Text style={styles.tagText}>All</Text>
            </TouchableOpacity>
            {tags.map(tag => {
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagPill,
                    { backgroundColor: getTagColor(tag) },
                    isSelected && styles.tagPillActive,
                  ]}
                  onPress={() =>
                    setSelectedTag(prev => (prev === tag ? '' : tag))
                  }
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.subtitle}>Recent notes</Text>
      </View>

      <FlatList
        style={styles.flatList}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
        scrollEnabled={true}
        data={filteredNotes}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No notes found. Create one or choose a different tag.
          </Text>
        }
        renderItem={({ item }) => (
          <NoteCard
            id={item.id}
            title={item.title}
            body={item.body}
            tags={parseTags(item.tags)}
            updated_at={item.updated_at}
            isFavorite={item.is_favorite === 1}
            tagColors={tagColorMap}
            onPress={() =>
              navigation.navigate('NoteDetail', { noteId: item.id })
            }
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 0,
    marginTop: -12,
  },
  headerContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tagPill: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPillActive: {
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  tagSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  tagText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
  },
  titleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  sortLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  sortOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sortPill: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortPillActive: {
    backgroundColor: '#1e88e5',
    borderColor: '#1e88e5',
  },
  sortText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  sortTextActive: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 8,
  },
  sectionHeading: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  statsText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
  },
  subtitle: {
    color: '#666666',
    marginTop: 16,
    marginBottom: 12,
  },
  sortMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  sortOverflowMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    minWidth: 140,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sortOverflowOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sortOverflowText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  sortOverflowTextActive: {
    color: '#1e88e5',
    fontWeight: '700',
  },
});
