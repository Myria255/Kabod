import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/supabaseClient";

export type AdminNotificationTargetScope = "all" | "general" | "jeune" | "mariee";

type NotifyUsersInput = {
  title: string;
  body: string;
  targetScope?: AdminNotificationTargetScope;
  data?: Record<string, string | number | boolean | null>;
};

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
  );
}

export async function registerCurrentDeviceForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === "web" || Constants.isDevice === false) return null;

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("kabod-admin-publications", {
      name: "Publications Kabod",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D9B75F",
    });
  }

  const projectId = getProjectId();
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResult.data;

  const { error } = await supabase.from("device_push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS,
      device_name: null,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" }
  );

  if (error) throw error;
  return token;
}

export async function notifyUsersFromAdmin(input: NotifyUsersInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke("notify-users", {
    body: {
      title: input.title,
      body: input.body,
      targetScope: input.targetScope ?? "all",
      data: input.data ?? {},
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
}
