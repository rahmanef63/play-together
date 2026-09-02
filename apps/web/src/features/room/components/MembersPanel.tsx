import type { RoomDetails } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";

export function MembersPanel({
  room,
  isHost,
  onCopy,
  onExit,
}: {
  room: RoomDetails;
  isHost: boolean;
  onCopy: () => void;
  onExit: () => void;
}) {
  return (
    <ScrollablePanel
      as="aside"
      className="members-panel"
      label="CONNECTED"
      title="Players"
      meta={`${room.activeMembers.length}/${room.maxPlayers}`}
      contentClassName="panel-scroll__content members-scroll-content"
      ariaLabel="Connected players"
    >
      <ul>
        {room.activeMembers.map((member) => (
          <li key={member.userId}>
            <span className="member-dot" />
            <strong>{member.displayName}</strong>
            {member.userId === room.hostUserId && <small>Host</small>}
          </li>
        ))}
      </ul>
      <div className="room-actions">
        <Button type="button" variant="secondary" fullWidth onClick={onCopy}>
          Copy invite
        </Button>
        <Button type="button" variant="danger" fullWidth onClick={onExit}>
          {isHost ? "Close room" : "Leave room"}
        </Button>
      </div>
    </ScrollablePanel>
  );
}
