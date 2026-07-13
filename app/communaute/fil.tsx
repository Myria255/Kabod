import { COLORS } from "@/src/constants/colors";
import {
  getCommunityFeedPosts,
  kindLabel,
  scopeLabel,
  type CommunityFeedPost,
  type CommunityFeedScope,
} from "@/src/services/communityFeedSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Filter = "general" | "mine";

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function scopeIcon(scope: CommunityFeedScope) {
  if (scope === "jeune") return "account-group-outline";
  if (scope === "mariee") return "heart-outline";
  return "earth";
}

export default function CommunityFeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [memberScope, setMemberScope] = useState<CommunityFeedScope | null>(null);
  const [filter, setFilter] = useState<Filter>("general");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPosts = useMemo(() => {
    if (filter === "general") return posts.filter((post) => post.targetScope === "general");
    return posts.filter((post) => post.targetScope === memberScope);
  }, [filter, memberScope, posts]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("users_profile")
          .select("type_communaute, appartient_communaute")
          .eq("user_id", user.id)
          .maybeSingle();

        const scope =
          data?.appartient_communaute === true &&
          (data.type_communaute === "jeune" || data.type_communaute === "mariee")
            ? data.type_communaute
            : null;
        setMemberScope(scope);
      } else {
        setMemberScope(null);
      }

      const rows = await getCommunityFeedPosts();
      setPosts(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger le fil communauté.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  async function openAudio(url: string | null) {
    if (!url) {
      Alert.alert("Audio indisponible", "Aucun audio n’est attaché à cette publication.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lecture impossible", "Impossible d’ouvrir cet audio pour le moment.");
      return;
    }

    await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor={COLORS.gold} />}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={styles.title}>Fil communauté</Text>
            <Text style={styles.subtitle}>
              Les annonces, encouragements et nouvelles publiés pour Kabod et votre groupe.
            </Text>
          </View>
        </View>

        <View style={styles.channelHeader}>
          <View style={styles.channelAvatar}>
            <MaterialCommunityIcons name="broadcast" size={28} color={COLORS.gold} />
          </View>
          <View style={styles.channelCopy}>
            <Text style={styles.channelTitle}>Canal Kabod</Text>
            <Text style={styles.channelSubtitle}>
              Annonces, affiches, audios et encouragements publiés par l’équipe.
            </Text>
          </View>
        </View>

        <View style={styles.filters}>
          <Pressable
            style={[styles.filter, filter === "general" && styles.filterActive]}
            onPress={() => setFilter("general")}
          >
            <Text style={[styles.filterText, filter === "general" && styles.filterTextActive]}>Général</Text>
          </Pressable>
          <Pressable
            style={[styles.filter, filter === "mine" && styles.filterActive, !memberScope && styles.filterDisabled]}
            disabled={!memberScope}
            onPress={() => setFilter("mine")}
          >
            <Text style={[styles.filterText, filter === "mine" && styles.filterTextActive]}>
              Ma communauté
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={25} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucune publication</Text>
            <Text style={styles.emptyText}>
              Les annonces et encouragements apparaîtront ici dès qu’un administrateur les publiera.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredPosts.map((post) => (
              <View key={post.id} style={[styles.postCard, post.pinned && styles.postCardPinned]}>
                <View style={styles.postTop}>
                  <View style={styles.postIcon}>
                    <MaterialCommunityIcons name={scopeIcon(post.targetScope)} size={20} color={COLORS.gold} />
                  </View>
                  <View style={styles.postMeta}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.kindBadge}>{kindLabel(post.kind)}</Text>
                      {post.pinned && <Text style={styles.pinnedBadge}>Épinglé</Text>}
                    </View>
                    <Text style={styles.postScope}>{scopeLabel(post.targetScope)} · {formatDate(post.publishedAt ?? post.createdAt)}</Text>
                  </View>
                </View>

                {!!post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} />}
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postBody}>{post.body}</Text>
                {!!post.audioUrl && (
                  <Pressable style={styles.audioButton} onPress={() => openAudio(post.audioUrl)}>
                    <View style={styles.audioPlay}>
                      <Ionicons name="play" size={14} color={COLORS.blueDark} />
                    </View>
                    <View style={styles.audioBars}>
                      <View style={[styles.audioBar, { height: 12 }]} />
                      <View style={[styles.audioBar, { height: 22 }]} />
                      <View style={[styles.audioBar, { height: 16 }]} />
                      <View style={[styles.audioBar, { height: 26 }]} />
                      <View style={[styles.audioBar, { height: 14 }]} />
                      <View style={[styles.audioBar, { height: 20 }]} />
                    </View>
                    <Text style={styles.audioText}>Écouter</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F1ED" },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 14,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  channelHeader: {
    borderRadius: 28,
    backgroundColor: COLORS.blueDark,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  channelAvatar: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217,183,95,0.25)",
  },
  channelCopy: { flex: 1, gap: 4 },
  channelTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  channelSubtitle: { color: "#D1D5DB", fontSize: 12.5, lineHeight: 18 },
  filters: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filter: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: { backgroundColor: COLORS.blueDark },
  filterDisabled: { opacity: 0.45 },
  filterText: { color: COLORS.gray, fontSize: 12.5, fontWeight: "900" },
  filterTextActive: { color: COLORS.white },
  centerCard: {
    minHeight: 160,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, lineHeight: 20, textAlign: "center" },
  list: { gap: 14 },
  postCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(230,234,242,0.85)",
    padding: 16,
    gap: 12,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  postCardPinned: { borderColor: COLORS.gold, backgroundColor: "#FFFDF7" },
  postTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  postIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  postMeta: { flex: 1, gap: 5 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  kindBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: COLORS.blueDark,
    color: COLORS.white,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10.5,
    fontWeight: "900",
    overflow: "hidden",
  },
  pinnedBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.goldSoft,
    color: COLORS.blueDark,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10.5,
    fontWeight: "900",
    overflow: "hidden",
  },
  postScope: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  postTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  postBody: { color: COLORS.blueDark, fontSize: 14, lineHeight: 22 },
  postImage: {
    width: "100%",
    height: 230,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
  },
  audioButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(217,183,95,0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
  },
  audioPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  audioBars: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  audioBar: {
    width: 4,
    borderRadius: 999,
    backgroundColor: "rgba(16,24,39,0.55)",
  },
  audioText: { color: COLORS.blueDark, fontSize: 12.5, fontWeight: "900" },
});
