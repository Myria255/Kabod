import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type UserProfile = {
  user_id: string;
  nom: string | null;
  role: string | null;
  isAdmin: boolean;
};

type UserContextType = {
  user: UserProfile | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error && mounted) {
        const profile = (data ?? {}) as Record<string, unknown>;

        const dbRole =
          typeof profile.role === "string"
            ? profile.role
            : typeof profile.type_compte === "string"
            ? profile.type_compte
            : null;

        const dbIsAdmin = profile.is_admin === true;

        const metadataRole =
          typeof session.user.user_metadata?.role === "string"
            ? session.user.user_metadata.role
            : typeof session.user.app_metadata?.role === "string"
            ? session.user.app_metadata.role
            : null;

        const effectiveRole = dbRole ?? metadataRole;
        const isAdmin =
          dbIsAdmin ||
          (typeof effectiveRole === "string" && effectiveRole.toLowerCase() === "admin");

        setUser({
          user_id:
            typeof profile.user_id === "string"
              ? profile.user_id
              : session.user.id,
          nom: typeof profile.nom === "string" ? profile.nom : null,
          role: effectiveRole,
          isAdmin,
        });
      }

      if (mounted) setLoading(false);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
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
