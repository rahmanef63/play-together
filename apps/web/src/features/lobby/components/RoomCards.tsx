import type { FormEvent } from "react";
import { navigate } from "../../../shared/navigation";
import type { MyRoomSummary, RoomSummary } from "../../../shared/types";

export function PublicRoomCard({
  room,
  onJoin,
}: {
  room: RoomSummary;
  onJoin: (room: RoomSummary) => void;
}) {
  return (
    <article className="room-card">
      <div>
        <div className="room-card__top">
          <strong>{room.name}</strong>
          {room.requiresPassword && <span title="Password protected">Locked</span>}
        </div>
        <p>
          {room.gameTitle} · hosted by {room.hostName}
        </p>
      </div>
      <div className="room-card__actions">
        <span>
          {room.availableSpots}/{room.maxPlayers} spots
        </span>
        <button className="secondary-button" type="button" onClick={() => onJoin(room)}>
          Join
        </button>
      </div>
    </article>
  );
}

export function OwnedRoomCard({
  room,
  editing,
  confirmingDelete,
  busy,
  onEdit,
  onCancelEdit,
  onDelete,
  onUpdate,
}: {
  room: MyRoomSummary;
  editing: boolean;
  confirmingDelete: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <article className="room-card room-card--owned">
      {editing ? (
        <form className="room-editor" onSubmit={onUpdate}>
          <div className="room-editor__meta">
            <strong>{room.gameTitle}</strong>
            <span>
              {room.gameVersion} · {room.code}
            </span>
          </div>
          <label className="field">
            <span>Room name</span>
            <input name="name" defaultValue={room.name} minLength={2} maxLength={64} required />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Visibility</span>
              <select name="visibility" defaultValue={room.visibility}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="field">
              <span>Player slots</span>
              <input
                name="maxPlayers"
                type="number"
                min={1}
                max={64}
                defaultValue={room.maxPlayers}
              />
            </label>
          </div>
          <label className="field">
            <span>Password action</span>
            <select name="passwordMode" defaultValue="keep">
              <option value="keep">Keep current</option>
              <option value="set">Set new password</option>
              <option value="remove">Remove password</option>
            </select>
          </label>
          <label className="field">
            <span>New password</span>
            <input
              name="password"
              type="password"
              minLength={4}
              maxLength={64}
              placeholder="Used only for Set new password"
            />
          </label>
          <div className="room-editor__actions">
            <button className="primary-button" type="submit" disabled={busy}>
              Save changes
            </button>
            <button className="ghost-button" type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <div className="room-card__top">
              <strong>{room.name}</strong>
              <span>{room.visibility}</span>
              <span>{room.status}</span>
              {room.requiresPassword && <span>Locked</span>}
            </div>
            <p>
              {room.gameTitle} · {room.gameVersion} · {room.code} · {room.activePlayers}/
              {room.maxPlayers} players
            </p>
          </div>
          <div className="room-card__actions room-card__actions--crud">
            {room.status === "open" && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigate(`/room/${room.code}`)}
              >
                Open
              </button>
            )}
            {room.status === "open" && (
              <button className="ghost-button" type="button" onClick={onEdit}>
                Edit
              </button>
            )}
            <button
              className={`ghost-button danger${confirmingDelete ? " danger-confirm" : ""}`}
              type="button"
              disabled={busy}
              onClick={onDelete}
            >
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
