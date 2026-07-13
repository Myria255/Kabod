import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { UserProvider } from "@/src/context/UserContext";
import { AppRouteGuard } from "@/src/navigation/AppRouteGuard";
import { PushNotificationBootstrap } from "@/src/components/PushNotificationBootstrap";
import { configureSpiritualNotifications } from "@/src/services/spiritualNotifications";

export default function RootLayout() {
  useEffect(() => {
    configureSpiritualNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserProvider>
          <PushNotificationBootstrap />
          <AppRouteGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="admin-space" />
              <Stack.Screen name="admin/contenus" />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
          </AppRouteGuard>
        </UserProvider>

        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
