import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type SpiritualReminderId = "dailyVerse" | "morningMeditation" | "prayerReminder" | "faithChallenge";

export type SpiritualReminder = {
  id: SpiritualReminderId;
  title: string;
  description: string;
  notificationTitle: string;
  notificationBody: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

export type SpiritualNotificationSettings = Record<SpiritualReminderId, SpiritualReminder>;

const SETTINGS_KEY = "KABOD_SPIRITUAL_NOTIFICATIONS_V1";
const SCHEDULE_IDS_KEY = "KABOD_SPIRITUAL_NOTIFICATION_SCHEDULE_IDS_V1";
const ANDROID_CHANNEL_ID = "kabod-spiritual-reminders";

export const DEFAULT_SPIRITUAL_REMINDERS: SpiritualNotificationSettings = {
  dailyVerse: {
    id: "dailyVerse",
    title: "Verset du jour",
    description: "Recevoir une parole pour commencer la journée.",
    notificationTitle: "Verset du jour",
    notificationBody: "Prenez un instant pour méditer la Parole aujourd’hui.",
    hour: 8,
    minute: 0,
    enabled: false,
  },
  morningMeditation: {
    id: "morningMeditation",
    title: "Méditation matinale",
    description: "Créer un rythme doux avant de démarrer.",
    notificationTitle: "Méditation matinale",
    notificationBody: "Un moment court pour vous recentrer avec Dieu.",
    hour: 7,
    minute: 30,
    enabled: false,
  },
  prayerReminder: {
    id: "prayerReminder",
    title: "Rappel de prière",
    description: "Faire une pause pour déposer vos sujets.",
    notificationTitle: "Pause prière",
    notificationBody: "Trois minutes peuvent suffire pour revenir à l’essentiel.",
    hour: 12,
    minute: 0,
    enabled: false,
  },
  faithChallenge: {
    id: "faithChallenge",
    title: "Challenge de foi",
    description: "Recevoir une petite action spirituelle à vivre.",
    notificationTitle: "Challenge de foi",
    notificationBody: "Choisissez un petit pas concret de foi aujourd’hui.",
    hour: 18,
    minute: 0,
    enabled: false,
  },
};

type ScheduleIds = Partial<Record<SpiritualReminderId, string>>;

function getExpoNotificationsModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications");
  } catch {
    return null;
  }
}

function normalizeSettings(value: unknown): SpiritualNotificationSettings {
  const raw = value && typeof value === "object" ? (value as Partial<SpiritualNotificationSettings>) : {};
  return {
    dailyVerse: { ...DEFAULT_SPIRITUAL_REMINDERS.dailyVerse, ...(raw.dailyVerse ?? {}) },
    morningMeditation: { ...DEFAULT_SPIRITUAL_REMINDERS.morningMeditation, ...(raw.morningMeditation ?? {}) },
    prayerReminder: { ...DEFAULT_SPIRITUAL_REMINDERS.prayerReminder, ...(raw.prayerReminder ?? {}) },
    faithChallenge: { ...DEFAULT_SPIRITUAL_REMINDERS.faithChallenge, ...(raw.faithChallenge ?? {}) },
  };
}

async function getScheduleIds(): Promise<ScheduleIds> {
  const raw = await AsyncStorage.getItem(SCHEDULE_IDS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveScheduleIds(ids: ScheduleIds) {
  await AsyncStorage.setItem(SCHEDULE_IDS_KEY, JSON.stringify(ids));
}

export function formatReminderTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function configureSpiritualNotifications() {
  const Notifications = getExpoNotificationsModule();
  if (!Notifications || Platform.OS === "web") return false;

  Notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync?.(ANDROID_CHANNEL_ID, {
      name: "Rappels spirituels",
      importance: Notifications.AndroidImportance?.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D9B75F",
    });
  }

  return true;
}

export async function loadSpiritualNotificationSettings(): Promise<SpiritualNotificationSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SPIRITUAL_REMINDERS;
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SPIRITUAL_REMINDERS;
  }
}

export async function saveSpiritualNotificationSettings(settings: SpiritualNotificationSettings) {
  const normalized = normalizeSettings(settings);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function ensureSpiritualNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const Notifications = getExpoNotificationsModule();
  if (!Notifications) return false;

  await configureSpiritualNotifications();

  const current = await Notifications.getPermissionsAsync();
  let granted = Boolean(current.granted || current.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL);
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = Boolean(asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL);
  }
  return granted;
}

export async function cancelSpiritualReminder(id: SpiritualReminderId) {
  const Notifications = getExpoNotificationsModule();
  if (!Notifications) return;

  const ids = await getScheduleIds();
  const scheduleId = ids[id];
  if (scheduleId) {
    await Notifications.cancelScheduledNotificationAsync(scheduleId);
    delete ids[id];
    await saveScheduleIds(ids);
  }
}

export async function scheduleSpiritualReminder(reminder: SpiritualReminder): Promise<boolean> {
  const Notifications = getExpoNotificationsModule();
  if (!Notifications || Platform.OS === "web") return false;

  const granted = await ensureSpiritualNotificationPermission();
  if (!granted) return false;

  await cancelSpiritualReminder(reminder.id);
  const scheduleId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.notificationTitle,
      body: reminder.notificationBody,
      sound: true,
    },
    trigger: {
      type: "daily",
      channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined,
      hour: reminder.hour,
      minute: reminder.minute,
    },
  });

  const ids = await getScheduleIds();
  ids[reminder.id] = scheduleId;
  await saveScheduleIds(ids);
  return true;
}

export async function applySpiritualNotificationSettings(settings: SpiritualNotificationSettings): Promise<boolean> {
  let allScheduled = true;
  for (const reminder of Object.values(settings)) {
    if (reminder.enabled) {
      const scheduled = await scheduleSpiritualReminder(reminder);
      allScheduled = allScheduled && scheduled;
    } else {
      await cancelSpiritualReminder(reminder.id);
    }
  }
  await saveSpiritualNotificationSettings(settings);
  return allScheduled;
}
