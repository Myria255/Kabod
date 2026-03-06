import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  return (
    <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />
  );
}

