import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getDefaultRouteForUser } from "@/src/services/authRedirect";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [targetRoute, setTargetRoute] = useState<"/(auth)/login" | "/(tabs)" | "/admin-space">(
    "/(auth)/login"
  );

  useEffect(() => {
    let mounted = true;

    async function resolveInitialRoute() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (!session?.user) {
        setTargetRoute("/(auth)/login");
        setLoading(false);
        return;
      }

      const nextRoute = await getDefaultRouteForUser(session.user.id);
      if (!mounted) return;
      setTargetRoute(nextRoute);
      setLoading(false);
    }

    resolveInitialRoute();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (!session?.user) {
          setTargetRoute("/(auth)/login");
          return;
        }

        const nextRoute = await getDefaultRouteForUser(session.user.id);
        if (!mounted) return;
        setTargetRoute(nextRoute);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  return <Redirect href={targetRoute} />;
}

