import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const { user } = useUser();
  const isAdmin = user?.isAdmin === true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: "#C7CBEA",
        tabBarStyle: {
          backgroundColor: COLORS.blueDark,
          borderTopColor: COLORS.gold,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? "Dashboard" : "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="meditation"
        options={{
          title: "Meditation & Priere",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="praying-hands" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="podcast"
        options={{
          title: "Podcast",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="communaute"
        options={{
          title: "Communaute",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? "/admin" : null,
          title: "Centre",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
