import { ScrollArea } from "../../../shared/ScrollArea";
import type { RoomDetails } from "../../../shared/types";

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
    <aside className="panel members-panel panel-frame">
      <div className="section-title">
        <div>
          <p className="eyebrow">CONNECTED</p>
          <h2>Players</h2>
        </div>
        <span>
          {room.activeMembers.length}/{room.maxPlayers}
        </span>
      </div>
      <ScrollArea className="panel-scroll" ariaLabel="Connected players">
        <div className="panel-scroll__content members-scroll-content">
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
            <button className="secondary-button full" type="button" onClick={onCopy}>
              Copy invite
            </button>
            <button className="ghost-button danger full" type="button" onClick={onExit}>
              {isHost ? "Close room" : "Leave room"}
            </button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
