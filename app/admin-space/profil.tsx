import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, signOut } = useUser();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const loadLocalProfileImage = useCallback(async () => {
    try {
      if (user?.user_id) {
        const savedImage = await AsyncStorage.getItem(`profile_image_${user.user_id}`);
        if (savedImage) setProfileImage(savedImage);
      }
    } catch (e) {
      console.error("Erreur lors du chargement de l'image locale", e);
    }
  }, [user?.user_id]);

  // Charger la photo locale au démarrage
  useEffect(() => {
    loadLocalProfileImage();
  }, [loadLocalProfileImage]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Désolé, nous avons besoin des permissions pour accéder à vos photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setProfileImage(selectedUri);
      
      // Sauvegarder localement
      try {
        if (user?.user_id) {
          await AsyncStorage.setItem(`profile_image_${user.user_id}`, selectedUri);
        }
      } catch (e) {
        console.error("Erreur lors de la sauvegarde de l'image", e);
      }
    }
  };

  async function handleLogout() {
    Alert.alert(
      "Déconnexion",
      "Souhaitez-vous quitter votre session ?",
      [
        { text: "Rester", style: "cancel" },
        { 
          text: "Quitter", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut();
              router.replace("/(auth)/login");
            } catch (error) {
              const message = error instanceof Error ? error.message : "Déconnexion impossible.";
              Alert.alert("Erreur", message);
            }
          }
        }
      ]
    );
  }

  const NavItem = ({ icon, title, onPress, isLast = false }: any) => (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[styles.navItem, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
    >
      <View style={styles.navIconWrapper}>
        <Ionicons name={icon} size={20} color={COLORS.gold} />
      </View>
      <Text style={styles.navText}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color="rgba(15, 23, 42, 0.2)" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        
        {/* Profile Section Centered & Sacred */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={pickImage} style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profilePic} />
              ) : (
                <Text style={styles.avatarText}>{(user?.nom ?? "A").charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.nom ?? "Administrateur"}</Text>
          <Text style={styles.userRole}>RESPONSABLE KABOD</Text>
        </View>

        {/* Modules Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MINISTÈRE</Text>
            <View style={styles.sectionLine} />
          </View>
          
          <View style={styles.card}>
            <NavItem 
              icon="heart-outline" 
              title="Espace de Prière" 
              onPress={() => router.push("/admin-space/priere")} 
            />
            <NavItem 
              icon="radio-outline" 
              title="Lives et Cultes" 
              onPress={() => router.push("/admin-space/lives")} 
            />
            <NavItem 
              icon="calendar-outline" 
              title="Évènements" 
              onPress={() => router.push("/admin-space/evenements")} 
              isLast 
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PARAMÈTRES</Text>
            <View style={styles.sectionLine} />
          </View>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>KABOD • SERVIR AVEC EXCELLENCE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD" },
  scrollPadding: { paddingBottom: 40 },
  
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  avatarText: { color: COLORS.gold, fontSize: 36, fontWeight: '800' },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.gold,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 24, fontWeight: '900', color: COLORS.blueDark, letterSpacing: -0.5 },
  userRole: { fontSize: 10, color: COLORS.gold, fontWeight: '800', letterSpacing: 2, marginTop: 6 },

  section: { marginTop: 10, paddingHorizontal: 24 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    gap: 12 
  },
  sectionTitle: { 
    fontSize: 11, 
    fontWeight: '900', 
    color: 'rgba(15, 23, 42, 0.4)', 
    letterSpacing: 2 
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(15, 23, 42, 0.05)' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.03)',
  },
  navIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  navText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.blueDark },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  logoutIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },

  footer: { 
    textAlign: 'center', 
    marginTop: 40, 
    fontSize: 10, 
    fontWeight: '800', 
    color: 'rgba(15, 23, 42, 0.15)', 
    letterSpacing: 2 
  }
});
