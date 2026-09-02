import type { FormEvent } from "react";
import { RoomCardSkeleton } from "../../../shared/Skeleton";
import type { MyRoomSummary, RoomSummary } from "../../../shared/types";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";
import { OwnedRoomCard, PublicRoomCard } from "./RoomCards";

export function RoomDirectory({
  roomTab,
  rooms,
  roomsLoading,
  myRooms,
  myRoomsLoading,
  busy,
  editingCode,
  deleteCode,
  onTabChange,
  onJoin,
  onEdit,
  onCancelEdit,
  onDelete,
  onUpdate,
}: {
  roomTab: "public" | "mine";
  rooms: RoomSummary[];
  roomsLoading: boolean;
  myRooms: MyRoomSummary[];
  myRoomsLoading: boolean;
  busy: boolean;
  editingCode: string | null;
  deleteCode: string | null;
  onTabChange: (tab: "public" | "mine") => void;
  onJoin: (room: RoomSummary) => void;
  onEdit: (code: string) => void;
  onCancelEdit: () => void;
  onDelete: (room: MyRoomSummary) => void;
  onUpdate: (event: FormEvent<HTMLFormElement>, room: MyRoomSummary) => void;
}) {
  const count = roomTab === "public" ? `${rooms.length} live` : `${myRooms.length} owned`;
  const toolbar = (
    <div className="room-tabs" role="tablist" aria-label="Room lists">
      <button
        type="button"
        role="tab"
        aria-selected={roomTab === "public"}
        className={roomTab === "public" ? "active" : ""}
        onClick={() => onTabChange("public")}
      >
        Public
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={roomTab === "mine"}
        className={roomTab === "mine" ? "active" : ""}
        onClick={() => onTabChange("mine")}
      >
        My rooms
      </button>
    </div>
  );
  return (
    <ScrollablePanel
      className="rooms-panel rooms-panel-frame"
      label="ROOM DIRECTORY"
      title={roomTab === "public" ? "Public rooms" : "My rooms"}
      meta={count}
      toolbar={toolbar}
      scrollClassName="room-list-scroll"
      contentClassName="room-list"
      ariaLabel={`${roomTab} room list`}
    >
      {roomTab === "public" ? (
        roomsLoading ? (
          <RoomCardSkeleton count={4} />
        ) : (
          rooms.map((room) => <PublicRoomCard key={room.code} room={room} onJoin={onJoin} />)
        )
      ) : myRoomsLoading ? (
        <RoomCardSkeleton count={4} />
      ) : (
        myRooms.map((room) => (
          <OwnedRoomCard
            key={room.code}
            room={room}
            editing={editingCode === room.code}
            confirmingDelete={deleteCode === room.code}
            busy={busy}
            onEdit={() => onEdit(room.code)}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(room)}
            onUpdate={(event) => onUpdate(event, room)}
          />
        ))
      )}
      {roomTab === "public" && !roomsLoading && !rooms.length && (
        <EmptyState
          title="No public rooms"
          body="Create the first room or join a private room using its code."
        />
      )}
      {roomTab === "mine" && !myRoomsLoading && !myRooms.length && (
        <EmptyState
          title="No rooms yet"
          body="Create a room and it will appear here for editing or deletion."
        />
      )}
    </ScrollablePanel>
  );
}
