import { useUser } from "@/src/context/UserContext";
import { Redirect, useSegments } from "expo-router";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const { user, isAuthenticated, loading } = useUser();

  if (loading) return null;

  const rootSegment = segments[0] as string | undefined;
  const isAuthRoute = rootSegment === "(auth)";
  const isAdminRoute = rootSegment === "admin-space" || rootSegment === "admin";
  const isEntryRoute = rootSegment === undefined || rootSegment === "index";
  const isPublicLegalRoute = rootSegment === "legal";

  if (!isAuthenticated && !isAuthRoute && !isEntryRoute && !isPublicLegalRoute) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && isAuthRoute) {
    return <Redirect href={user?.isAdmin ? "/admin-space" : "/(tabs)"} />;
  }

  if (isAuthenticated && isAdminRoute && !user?.isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}
