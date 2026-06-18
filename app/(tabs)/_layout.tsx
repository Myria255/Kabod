import { COLORS } from "@/src/constants/colors";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: "rgba(255,255,255,0.58)",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: {
          height: 62 + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
          backgroundColor: COLORS.blueDark,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          shadowColor: COLORS.blueDark,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: Platform.OS === "ios" ? 0.06 : 0,
          shadowRadius: 10,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={21} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="bibliotheque"
        options={{
          title: "Bible",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guidance"
        options={{
          title: "Guidance",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={21} color={color} />
          ),
        }}
      />


      <Tabs.Screen
        name="priere"
        options={{
          title: "Prière",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="praying-hands" size={18} color={color} />
          ),
        }}
      />


      <Tabs.Screen
        name="communaute"
        options={{
          title: "Communauté",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-group" size={23} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="meditation" options={{ href: null }} />
      <Tabs.Screen name="podcast" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
