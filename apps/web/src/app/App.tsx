import { useConvexAuth, useQuery } from "convex/react";
import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { AuthPage } from "../features/auth/AuthPage";
import { LobbyPage } from "../features/lobby/LobbyPage";
import { AppDock } from "../shared/AppDock";
import { api } from "../shared/convexApi";
import { currentPath, navigate } from "../shared/navigation";
import { PwaUpdateToast } from "../shared/PwaUpdateToast";
import { RouteSkeleton } from "../shared/Skeleton";
import type { CurrentUser } from "../shared/types";

const OpsPage = lazy(() =>
  import("../features/ops/OpsPage").then((module) => ({ default: module.OpsPage })),
);
const PlayPage = lazy(() =>
  import("../features/play/PlayPage").then((module) => ({ default: module.PlayPage })),
);
const RoomPage = lazy(() =>
  import("../features/room/RoomPage").then((module) => ({ default: module.RoomPage })),
);
const TemplatesPage = lazy(() =>
  import("../features/templates/TemplatesPage").then((module) => ({
    default: module.TemplatesPage,
  })),
);
const DevelopersPage = lazy(() =>
  import("../features/developers/DevelopersPage").then((module) => ({
    default: module.DevelopersPage,
  })),
);

export function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.loggedInUser) as CurrentUser | null | undefined;
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPath = () => setPath(currentPath());
    window.addEventListener("popstate", onPath);
    return () => window.removeEventListener("popstate", onPath);
  }, []);

  if (isLoading || (isAuthenticated && user === undefined)) {
    return <CenteredState label="Connecting to Play Together…" />;
  }
  if (!isAuthenticated || !user) {
    return (
      <>
        <AuthPage />
        <PwaUpdateToast />
      </>
    );
  }

  const playMatch = path.match(/^\/play\/([A-Z0-9]+)\/(controller|display|remote)$/i);
  const playCode = playMatch?.[1];
  const routeRole = playMatch?.[2];
  const playRole = routeRole === "remote" ? "auto" : routeRole;
  if (playCode && (playRole === "controller" || playRole === "display" || playRole === "auto")) {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <PlayPage code={playCode.toUpperCase()} role={playRole} user={user} />
        <PwaUpdateToast quiet />
      </Suspense>
    );
  }

  const roomMatch = path.match(/^\/room\/([A-Z0-9]+)$/i);
  const roomCode = roomMatch?.[1];
  if (roomCode) return withAppChrome(<RoomPage code={roomCode.toUpperCase()} user={user} />, path);
  if (path === "/ops") return withAppChrome(<OpsPage user={user} />, path);
  if (path === "/templates") return withAppChrome(<TemplatesPage user={user} />, path);
  if (path === "/developers") return withAppChrome(<DevelopersPage user={user} />, path);
  if (path === "/rooms") return withAppChrome(<LobbyPage user={user} focus="rooms" />, path);
  if (path === "/") return withAppChrome(<LobbyPage user={user} focus="home" />, path);

  navigate("/");
  return <RouteSkeleton />;
}

function withAppChrome(page: ReactNode, path: string) {
  return (
    <>
      <Suspense fallback={<RouteSkeleton />}>{page}</Suspense>
      <AppDock path={path} />
      <PwaUpdateToast />
    </>
  );
}

function CenteredState({ label }: { label: string }) {
  return (
    <main className="centered-state">
      <span className="pulse-dot" />
      <p>{label}</p>
    </main>
  );
}
