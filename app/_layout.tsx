import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { UserProvider } from "@/src/context/UserContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* 👤 Utilisateur Supabase (global) */}
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Groupes */}
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin/contenus" />

          {/* Modales */}
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal" }}
          />
        </Stack>
      </UserProvider>

      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
