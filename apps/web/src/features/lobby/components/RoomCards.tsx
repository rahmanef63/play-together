import type { FormEvent } from "react";
import { navigate } from "../../../shared/navigation";
import type { MyRoomSummary, RoomSummary } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { FormField } from "../../../shared/ui/FormField";

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
        <Button variant="secondary" type="button" onClick={() => onJoin(room)}>
          Join
        </Button>
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
          <FormField
            label="Room name"
            control={
              <input name="name" defaultValue={room.name} minLength={2} maxLength={64} required />
            }
          />
          <div className="form-row">
            <FormField
              label="Visibility"
              control={
                <select name="visibility" defaultValue={room.visibility}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              }
            />
            <FormField
              label="Player slots"
              control={
                <input
                  name="maxPlayers"
                  type="number"
                  min={1}
                  max={64}
                  defaultValue={room.maxPlayers}
                />
              }
            />
          </div>
          <FormField
            label="Password action"
            control={
              <select name="passwordMode" defaultValue="keep">
                <option value="keep">Keep current</option>
                <option value="set">Set new password</option>
                <option value="remove">Remove password</option>
              </select>
            }
          />
          <FormField
            label="New password"
            control={
              <input
                name="password"
                type="password"
                minLength={4}
                maxLength={64}
                placeholder="Used only for Set new password"
              />
            }
          />
          <div className="room-editor__actions">
            <Button type="submit" busy={busy}>
              Save changes
            </Button>
            <Button variant="ghost" type="button" onClick={onCancelEdit}>
              Cancel
            </Button>
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
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(`/room/${room.code}`)}
              >
                Open
              </Button>
            )}
            {room.status === "open" && (
              <Button variant="ghost" type="button" onClick={onEdit}>
                Edit
              </Button>
            )}
            <Button
              variant="danger"
              className={confirmingDelete ? "danger-confirm" : ""}
              type="button"
              busy={busy}
              onClick={onDelete}
            >
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
