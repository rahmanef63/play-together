import { navigate } from "../../shared/navigation";
import type { CurrentUser } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { RoomInviteView } from "./components/RoomInviteView";
import { RoomMemberView } from "./components/RoomMemberView";
import { useRoomSession } from "./model/useRoomSession";

export function RoomPage({ code, user }: { code: string; user: CurrentUser }) {
  const session = useRoomSession(code, user);
  if (session.room === undefined) return <RoomState label="Loading room…" />;
  if (!session.room) return <RoomState label="Room not found" action={() => navigate("/")} />;
  if (!session.isMember)
    return (
      <RoomInviteView
        room={session.room}
        password={session.password}
        busy={session.busy}
        error={session.error}
        onPasswordChange={session.setPassword}
        onJoin={(event) => void session.join(event)}
      />
    );
  const isHost = session.room.hostUserId === user.id;
  return (
    <RoomMemberView
      code={code}
      room={session.room}
      copied={session.copied}
      error={session.error}
      isHost={isHost}
      onCopy={() => void session.copyInvite()}
      onExit={() => void (isHost ? session.closeRoom() : session.exitRoom())}
    />
  );
}

function RoomState({ label, action }: { label: string; action?: () => void }) {
  return (
    <main className="centered-state">
      <p>{label}</p>
      {action && (
        <Button type="button" onClick={action}>
          Back to lobby
        </Button>
      )}
    </main>
  );
}
