import { useAuthActions } from "@convex-dev/auth/react";
import type { CurrentUser } from "../../shared/types";
import { HorizontalSnap } from "../../shared/ui/HorizontalSnap";
import { CreateRoomPanel } from "./components/CreateRoomPanel";
import { LobbyHeader } from "./components/LobbyHeader";
import { LobbyHeading } from "./components/LobbyHeading";
import { RoomDirectory } from "./components/RoomDirectory";
import { useGameCatalog } from "./model/useGameCatalog";
import { useRoomDirectory } from "./model/useRoomDirectory";

export function LobbyPage({
  user,
  focus = "home",
}: {
  user: CurrentUser;
  focus?: "home" | "rooms";
}) {
  const { signOut } = useAuthActions();
  const catalog = useGameCatalog();
  const directory = useRoomDirectory(catalog.gameById);

  return (
    <main className={`app-shell app-shell--lobby${focus === "rooms" ? " app-shell--rooms" : ""}`}>
      <LobbyHeader user={user} onSignOut={() => void signOut()} />
      <LobbyHeading
        user={user}
        code={directory.joinCode}
        password={directory.joinPassword}
        busy={directory.busy}
        onCodeChange={directory.setJoinCode}
        onPasswordChange={directory.setJoinPassword}
        onJoin={() => void directory.onJoin()}
      />
      {directory.error && (
        <p className="global-error" role="alert">
          {directory.error}
        </p>
      )}
      <HorizontalSnap className="lobby-grid" ariaLabel="Lobby panels">
        <CreateRoomPanel
          user={user}
          games={catalog.games}
          loadingGames={catalog.loadingGames}
          selectedGame={catalog.selectedGame}
          selectedManifest={catalog.selectedManifest}
          selectedManifestError={catalog.selectedManifestError}
          effectiveGameKey={catalog.effectiveGameKey}
          busy={directory.busy}
          onGameChange={catalog.setSelectedGameKey}
          onSubmit={(event) => void directory.onCreate(event)}
        />
        <RoomDirectory
          roomTab={directory.roomTab}
          rooms={directory.rooms}
          roomsLoading={directory.roomsResult === undefined}
          myRooms={directory.myRooms}
          myRoomsLoading={directory.myRoomsResult === undefined}
          busy={directory.busy}
          editingCode={directory.editingCode}
          deleteCode={directory.deleteCode}
          onTabChange={directory.setRoomTab}
          onJoin={(room) => {
            directory.setJoinCode(room.code);
            if (!room.requiresPassword) void directory.onJoin(room.code, "");
          }}
          onEdit={directory.setEditingCode}
          onCancelEdit={() => directory.setEditingCode(null)}
          onDelete={(room) => void directory.onDelete(room)}
          onUpdate={(event, room) => void directory.onUpdate(event, room)}
        />
      </HorizontalSnap>
    </main>
  );
}
