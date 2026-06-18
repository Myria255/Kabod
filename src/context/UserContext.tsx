import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { COLORS } from "@/src/constants/colors";
import { supabase } from "@/supabaseClient";

type UserProfile = {
  user_id: string;
  nom: string | null;
  role: string | null;
  isAdmin: boolean;
};

type UserContextType = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

function normalizeRole(value: unknown): string | null {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function buildUserProfile(
  sessionUserId: string,
  profile: Record<string, unknown> | null | undefined
): UserProfile {
  const role = normalizeRole(profile?.role);

  return {
    user_id: typeof profile?.user_id === "string" ? profile.user_id : sessionUserId,
    nom: typeof profile?.nom === "string" ? profile.nom : null,
    role,
    isAdmin: role === "admin",
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);

    const { data, error } = await supabase
      .from("users_profile")
      .select("user_id, nom, role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      // Une session valide ne doit pas être traitée comme déconnectée à cause
      // d'une lecture de profil momentanément indisponible.
      setUser(buildUserProfile(session.user.id, null));
      setLoading(false);
      return;
    }

    setUser(buildUserProfile(session.user.id, (data ?? null) as Record<string, unknown> | null));
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    const safeRefresh = async () => {
      if (!mounted) return;
      await refreshUser();
    };

    safeRefresh();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      await refreshUser();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isAuthenticated, loading, refreshUser }}>
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
          }}
        >
          <ActivityIndicator size="small" color={COLORS.blueDark} />
        </View>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
};
