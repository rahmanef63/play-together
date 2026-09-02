import { navigate } from "../../../shared/navigation";
import type { RoomDetails } from "../../../shared/types";
import { HorizontalSnap } from "../../../shared/ui/HorizontalSnap";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";

export function LaunchPanel({ code, room }: { code: string; room: RoomDetails }) {
  return (
    <ScrollablePanel
      className="launch-panel"
      label="CHOOSE THIS DEVICE"
      title="How are you playing?"
      ariaLabel="Play modes"
    >
      <HorizontalSnap className="launch-grid" ariaLabel="Available play modes">
        {room.gameModes.includes("shared-screen") && room.supportsRemote && (
          <button
            className="launch-card display-card"
            type="button"
            aria-label="Remote"
            onClick={() => navigate(`/play/${code}/remote`)}
          >
            <span className="launch-icon">▣ + ◉</span>
            <strong>Remote</strong>
            <p>
              TV or laptop becomes the display; phones become controllers automatically. Connected
              remotes are discovered live and the game chooses shared or split screen.
            </p>
          </button>
        )}
        {room.supportsHandheld && (
          <button
            className="launch-card"
            type="button"
            onClick={() => navigate(`/play/${code}/controller?mode=handheld`)}
          >
            <span className="launch-icon">▤</span>
            <strong>Handheld console</strong>
            <p>{orientationCopy(room.preferredOrientation)}</p>
          </button>
        )}
      </HorizontalSnap>
    </ScrollablePanel>
  );
}

function orientationCopy(orientation: RoomDetails["preferredOrientation"]): string {
  if (orientation === "landscape") return "Designed for a PSP-style landscape layout.";
  if (orientation === "portrait") return "Designed for a Game Boy-style portrait layout.";
  return "Portrait feels like Game Boy; landscape rearranges like PSP.";
}
