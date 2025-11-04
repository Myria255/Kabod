// app/tabs/Bible.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { getChapter } from '../services/bibleService';
import Config from 'react-native-config';

// === LISTE COMPLÈTE DES LIVRES (66) ===
const BIBLE_BOOKS = [
  { id: 'GEN', name: 'Genèse' }, { id: 'EXO', name: 'Exode' }, { id: 'LEV', name: 'Lévitique' },
  { id: 'NUM', name: 'Nombres' }, { id: 'DEU', name: 'Deutéronome' }, { id: 'JOS', name: 'Josué' },
  { id: 'JDG', name: 'Juges' }, { id: 'RUT', name: 'Ruth' }, { id: '1SA', name: '1 Samuel' },
  { id: '2SA', name: '2 Samuel' }, { id: '1KI', name: '1 Rois' }, { id: '2KI', name: '2 Rois' },
  { id: '1CH', name: '1 Chroniques' }, { id: '2CH', name: '2 Chroniques' }, { id: 'EZR', name: 'Esdras' },
  { id: 'NEH', name: 'Néhémie' }, { id: 'EST', name: 'Esther' }, { id: 'JOB', name: 'Job' },
  { id: 'PSA', name: 'Psaumes' }, { id: 'PRO', name: 'Proverbes' }, { id: 'ECC', name: 'Ecclésiaste' },
  { id: 'SNG', name: 'Cantique des Cantiques' }, { id: 'ISA', name: 'Ésaïe' }, { id: 'JER', name: 'Jérémie' },
  { id: 'LAM', name: 'Lamentations' }, { id: 'EZK', name: 'Ézéchiel' }, { id: 'DAN', name: 'Daniel' },
  { id: 'HOS', name: 'Osée' }, { id: 'JOL', name: 'Joël' }, { id: 'AMO', name: 'Amos' },
  { id: 'OBA', name: 'Abdias' }, { id: 'JON', name: 'Jonas' }, { id: 'MIC', name: 'Michée' },
  { id: 'NAM', name: 'Nahum' }, { id: 'HAB', name: 'Habacuc' }, { id: 'ZEP', name: 'Sophonie' },
  { id: 'HAG', name: 'Aggée' }, { id: 'ZEC', name: 'Zacharie' }, { id: 'MAL', name: 'Malachie' },
  { id: 'MAT', name: 'Matthieu' }, { id: 'MRK', name: 'Marc' }, { id: 'LUK', name: 'Luc' },
  { id: 'JHN', name: 'Jean' }, { id: 'ACT', name: 'Actes' }, { id: 'ROM', name: 'Romains' },
  { id: '1CO', name: '1 Corinthiens' }, { id: '2CO', name: '2 Corinthiens' }, { id: 'GAL', name: 'Galates' },
  { id: 'EPH', name: 'Éphésiens' }, { id: 'PHP', name: 'Philippiens' }, { id: 'COL', name: 'Colossiens' },
  { id: '1TH', name: '1 Thessaloniciens' }, { id: '2TH', name: '2 Thessaloniciens' }, { id: '1TI', name: '1 Timothée' },
  { id: '2TI', name: '2 Timothée' }, { id: 'TIT', name: 'Tite' }, { id: 'PHM', name: 'Philémon' },
  { id: 'HEB', name: 'Hébreux' }, { id: 'JAS', name: 'Jacques' }, { id: '1PE', name: '1 Pierre' },
  { id: '2PE', name: '2 Pierre' }, { id: '1JN', name: '1 Jean' }, { id: '2JN', name: '2 Jean' },
  { id: '3JN', name: '3 Jean' }, { id: 'JUD', name: 'Jude' }, { id: 'REV', name: 'Apocalypse' },
];

// === NOMBRE DE CHAPITRES PAR LIVRE ===
const CHAPTER_COUNTS = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4,
  '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25, '1CH': 29, '2CH': 36, EZR: 10,
  NEH: 13, EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8,
  ISA: 66, JER: 52, LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 3, AMO: 9,
  OBA: 1, JON: 4, MIC: 7, NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 4,
  MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13,
  GAL: 6, EPH: 6, PHP: 4, COL: 4, '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4,
  TIT: 3, PHM: 1, HEB: 13, JAS: 5, '1PE': 5, '2PE': 3, '1JN': 5, '2JN': 1,
  '3JN': 1, JUD: 1, REV: 22,
};

export default function Bible() {
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_KEY = Config.BIBLE_API_KEY;

  // === RECHERCHE EN TEMPS RÉEL ===
  const filteredBooks = useMemo(() => {
    if (!search.trim()) return BIBLE_BOOKS;
    const lower = search.toLowerCase();
    return BIBLE_BOOKS.filter(book => book.name.toLowerCase().includes(lower));
  }, [search]);

  // === ACTIONS ===
  const openBook = (book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setVerses([]);
    setSearch('');
  };

  const openChapter = async (chapter) => {
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      const data = await getChapter(API_KEY, `${selectedBook.id}.${chapter}`);
      setVerses(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger le chapitre.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setVerses([]);
  };

  const goToChapters = () => {
    setSelectedChapter(null);
    setVerses([]);
  };

  // === RENDU ===
  const renderBook = ({ item }) => (
    <TouchableOpacity style={styles.bookItem} onPress={() => openBook(item)}>
      <Text style={styles.bookText}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={22} color="#87CEEB" />
    </TouchableOpacity>
  );

  const renderChapter = ({ item }) => (
    <TouchableOpacity style={styles.chapterItem} onPress={() => openChapter(item)}>
      <Text style={styles.chapterText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderVerse = ({ item }) => (
    <View style={styles.verseContainer}>
      <Text style={styles.verseNumber}>{item.verse}</Text>
      <Text style={styles.verseText}>{item.content.replace(/<[^>]+>/g, '').trim()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* BARRE DE RECHERCHE */}
      {!selectedBook && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#87CEEB" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un livre..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={22} color="#aaa" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* EN-TÊTE DYNAMIQUE */}
      {selectedBook && (
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#87CEEB" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{selectedBook.name}</Text>
            {selectedChapter && (
              <Text style={styles.headerSubtitle}>Chapitre {selectedChapter}</Text>
            )}
          </View>
        </View>
      )}

      {/* LISTE DES LIVRES */}
      {!selectedBook && (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => <Text style={styles.empty}>Aucun livre trouvé</Text>}
        />
      )}

      {/* GRILLE DES CHAPITRES */}
      {selectedBook && !selectedChapter && (
        <FlatList
          data={Array.from({ length: CHAPTER_COUNTS[selectedBook.id] }, (_, i) => i + 1)}
          numColumns={5}
          renderItem={renderChapter}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          key="chapters-grid"
        />
      )}

      {/* VERSETS */}
      {selectedChapter && (
        <FlatList
          data={verses}
          keyExtractor={(item) => item.id}
          renderItem={renderVerse}
          contentContainerStyle={styles.verses}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <TouchableOpacity onPress={goToChapters} style={styles.backLink}>
              <Ionicons name="chevron-back" size={20} color="#87CEEB" />
              <Text style={styles.backText}>Retour aux chapitres</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            loading ? (
              <ActivityIndicator size="large" color="#87CEEB" style={styles.loader} />
            ) : null
          )}
        />
      )}
    </SafeAreaView>
  );
}

// === STYLES IMPECCABLES ===
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#e3f2fd',
  },
  searchInput: { 
    flex: 1, 
    fontSize: 17, 
    marginLeft: 12, 
    color: '#1a1a1a', 
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e8eaed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: '#666', 
    marginTop: 3,
    fontWeight: '500',
  },
  list: { 
    paddingHorizontal: 16, 
    paddingTop: 4,
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    marginBottom: 2,
    borderRadius: 10,
  },
  bookText: { 
    fontSize: 17, 
    fontWeight: '500', 
    color: '#1a1a1a',
    letterSpacing: 0.1,
  },
  grid: { 
    padding: 14,
    paddingTop: 8,
  },
  chapterItem: {
    flex: 1,
    margin: 5,
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e3f2fd',
    minHeight: 60,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chapterText: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#87CEEB',
  },
  verses: { 
    paddingHorizontal: 16, 
    paddingBottom: 24,
    paddingTop: 4,
  },
  verseContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 3,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  verseNumber: { 
    fontWeight: '700', 
    color: '#87CEEB', 
    width: 38,
    fontSize: 16,
  },
  verseText: { 
    flex: 1, 
    fontSize: 16.5, 
    lineHeight: 26, 
    color: '#2c2c2c',
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  backLink: { 
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', 
    marginVertical: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
  },
  backText: { 
    color: '#87CEEB', 
    fontSize: 15, 
    fontWeight: '600', 
    marginLeft: 6,
  },
  empty: { 
    textAlign: 'center', 
    marginTop: 80, 
    color: '#999', 
    fontSize: 16,
    fontWeight: '500',
  },
  loader: { 
    marginTop: 40,
  },
});