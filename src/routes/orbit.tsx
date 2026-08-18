// @ts-nocheck
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/hooks/use-auth";
import { useOrbitLive } from "@/hooks/use-orbit-live";
import { getMyOrbitProfile } from "@/lib/api/orbit-identity";


export const Route = createFileRoute("/orbit")({ component: OrbitUniverse });

/**
 * Orbit is its own universe inside Samsta: every child route lives behind this
 * gate, which requires a separate Orbit profile before the feed opens.
 */
function OrbitUniverse() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useOrbitLive();


  const { data: profile, isLoading } = useQuery({
    queryKey: ["orbit-profile", user?.id ?? null],
    queryFn: () => getMyOrbitProfile(user?.id ?? null),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const onSetup = pathname.startsWith("/orbit/setup");

  useEffect(() => {
    // Route state can update just before this parent unmounts. Never let the
    // Orbit profile gate pull navigation outside /orbit back into setup.
    if (!pathname.startsWith("/orbit")) return;
    if (loading || !user) return;
    if (isLoading) return;
    if (!profile && !onSetup) navigate({ to: "/orbit/setup", replace: true });
    if (profile && onSetup) navigate({ to: "/orbit", replace: true });
  }, [loading, user, profile, isLoading, onSetup, navigate]);

  return (
    <div className="orbit-universe min-h-dvh">
      <Outlet />
    </div>
  );
}
