import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AuthPage } from "../features/auth/AuthPage";
import { LobbyPage } from "../features/lobby/LobbyPage";
import { OpsPage } from "../features/ops/OpsPage";
import { PlayPage } from "../features/play/PlayPage";
import { RoomPage } from "../features/room/RoomPage";
import { TemplatesPage } from "../features/templates/TemplatesPage";
import { api } from "../shared/convexApi";
import { currentPath, navigate } from "../shared/navigation";
import type { CurrentUser } from "../shared/types";

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
  if (!isAuthenticated || !user) return <AuthPage />;

  const playMatch = path.match(/^\/play\/([A-Z0-9]+)\/(controller|display)$/i);
  const playCode = playMatch?.[1];
  const playRole = playMatch?.[2];
  if (playCode && (playRole === "controller" || playRole === "display")) {
    return <PlayPage code={playCode.toUpperCase()} role={playRole} />;
  }
  const roomMatch = path.match(/^\/room\/([A-Z0-9]+)$/i);
  const roomCode = roomMatch?.[1];
  if (roomCode) return <RoomPage code={roomCode.toUpperCase()} user={user} />;
  if (path === "/ops") return <OpsPage user={user} />;
  if (path === "/templates") return <TemplatesPage user={user} />;
  if (path !== "/") navigate("/");
  return <LobbyPage user={user} />;
}

function CenteredState({ label }: { label: string }) {
  return (
    <main className="centered-state">
      <span className="pulse-dot" />
      <p>{label}</p>
    </main>
  );
}
