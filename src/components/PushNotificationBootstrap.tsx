import { useEffect } from "react";

import { useUser } from "@/src/context/UserContext";
import { registerCurrentDeviceForPushNotifications } from "@/src/services/pushNotifications";

export function PushNotificationBootstrap() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.user_id) return;
    registerCurrentDeviceForPushNotifications(user.user_id).catch((error) => {
      console.warn("Push notification registration failed", error);
    });
  }, [user?.user_id]);

  return null;
}
