import { roomInviteUrl } from "../../../shared/inviteLinks";
import { ShareLink } from "../../../shared/ShareLink";
import type { RoomDetails } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";

export function MembersPanel({
  room,
  isHost,
  onExit,
}: {
  room: RoomDetails;
  isHost: boolean;
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
        <ShareLink
          url={roomInviteUrl(location.origin, room.code)}
          title={`${room.gameTitle} · ${room.name}`}
        />
        <p className="muted">
          Send this link to friends. They choose phone remote or handheld after joining.
        </p>
        <Button type="button" variant="danger" fullWidth onClick={onExit}>
          {isHost ? "Close room" : "Leave room"}
        </Button>
      </div>
    </ScrollablePanel>
  );
}
