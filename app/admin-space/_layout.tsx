import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

export default function AdminTabsLayout() {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user?.isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: "#B8C0D9",
        tabBarStyle: {
          backgroundColor: COLORS.blueDark,
          borderTopColor: "rgba(212,175,55,0.35)",
          borderTopWidth: 1,
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="priere"
        options={{
          title: "Priere",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="hands-pray" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lives"
        options={{
          title: "Lives",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="evenements"
        options={{
          title: "Evenements",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="communaute-management"
        options={{
          title: "Communauté",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="podcast-priere"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="priere-administrateur"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sujet-journalier"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="live-cultes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="evenement-a-venir"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="livres"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="communaute-create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="fil-communaute"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="temoignages"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="requetes-soutien"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="replay-evenements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dons"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="donnees-rgpd"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
