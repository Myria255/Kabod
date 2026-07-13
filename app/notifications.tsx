import {
  AppNotification,
  getMyAppNotifications,
  markAllAppNotificationsRead,
  markAppNotificationRead,
} from "@/src/services/appNotifications";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "book":
      return "book-outline";
    case "event":
      return "calendar-outline";
    case "prayer":
      return "heart-outline";
    case "podcast":
      return "mic-outline";
    case "testimony":
      return "sparkles-outline";
    case "community":
      return "people-outline";
    default:
      return "notifications-outline";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    try {
      const rows = await getMyAppNotifications();
      setNotifications(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les notifications.";
      Alert.alert("Notifications", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handlePressNotification = async (notification: AppNotification) => {
    if (!notification.read_at) {
      await markAppNotificationRead(notification.id).catch(() => null);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    }

    if (notification.route) {
      router.push(notification.route as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllAppNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action impossible.";
      Alert.alert("Notifications", message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.blueDark, COLORS.blueMid]} style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.readAllButton, unreadCount === 0 && styles.readAllButtonDisabled]}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <Ionicons name="checkmark-done-outline" size={17} color={COLORS.white} />
              <Text style={styles.readAllText}>Tout lu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="notifications" size={28} color={COLORS.blueDark} />
          </View>
          <Text style={styles.heroTitle}>Notifications reçues</Text>
          <Text style={styles.heroSubtitle}>
            Retrouvez ici les annonces importantes publiées par l’administration.
          </Text>

          <View style={styles.counterPill}>
            <View style={[styles.counterDot, unreadCount === 0 && styles.counterDotRead]} />
            <Text style={styles.counterText}>
              {unreadCount === 0 ? "Tout est à jour" : `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`}
            </Text>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.blueDark} />
            <Text style={styles.loadingText}>Chargement des notifications...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications("refresh")} />
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="mail-open-outline" size={30} color={COLORS.gold} />
                </View>
                <Text style={styles.emptyTitle}>Aucune notification</Text>
                <Text style={styles.emptyText}>
                  Les nouvelles annonces de l’administration apparaîtront ici.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const unread = !item.read_at;
              const icon = getNotificationIcon(item.notification_type);

              return (
                <TouchableOpacity
                  style={[styles.card, unread && styles.cardUnread]}
                  activeOpacity={0.86}
                  onPress={() => handlePressNotification(item)}
                >
                  <View style={[styles.cardIcon, unread && styles.cardIconUnread]}>
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={21}
                      color={unread ? COLORS.blueDark : COLORS.gray}
                    />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, unread && styles.cardTitleUnread]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {unread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardText} numberOfLines={3}>
                      {item.body}
                    </Text>
                    <Text style={styles.cardDate}>{formatNotificationDate(item.created_at)}</Text>
                  </View>

                  {item.route ? <Ionicons name="chevron-forward" size={18} color={COLORS.gray} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 18,
    gap: 16,
  },
  hero: {
    borderRadius: 26,
    padding: 18,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  readAllButton: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 13,
    backgroundColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readAllButtonDisabled: { opacity: 0.45 },
  readAllText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  heroTitle: { marginTop: 14, color: COLORS.white, fontSize: 27, fontWeight: "900" },
  heroSubtitle: { marginTop: 7, color: "#D7DEEA", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  counterPill: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.gold },
  counterDotRead: { backgroundColor: COLORS.emerald },
  counterText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: COLORS.gray, fontSize: 13, fontWeight: "700" },
  list: { paddingBottom: 28, gap: 12 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardUnread: {
    borderColor: "#D9B75F66",
    backgroundColor: "#FFFCF2",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconUnread: { backgroundColor: COLORS.goldSoft },
  cardBody: { flex: 1, gap: 5 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, color: COLORS.blueDark, fontSize: 15, fontWeight: "800" },
  cardTitleUnread: { fontWeight: "900" },
  unreadDot: { marginTop: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.gold },
  cardText: { color: COLORS.gray, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  cardDate: { color: "#9CA3AF", fontSize: 11, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  emptyText: { marginTop: 6, color: COLORS.gray, fontSize: 13, lineHeight: 19, textAlign: "center" },
});
