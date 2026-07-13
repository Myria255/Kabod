import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationPayload = {
  title: string;
  body: string;
};

function isExpoGoAndroid() {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

async function getExpoNotificationsModule(): Promise<any | null> {
  if (Platform.OS === "web" || isExpoGoAndroid()) return null;

  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const Notifications = await getExpoNotificationsModule();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  return Boolean(granted);
}

export async function sendImmediateLocalNotification(payload: NotificationPayload): Promise<boolean> {
  const Notifications = await getExpoNotificationsModule();
  if (!Notifications) return false;

  const granted = await ensureLocalNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      sound: true,
    },
    trigger: null,
  });
  return true;
}
