import { navigate } from "../../../shared/navigation";
import { ScrollArea } from "../../../shared/ScrollArea";
import type { RoomDetails } from "../../../shared/types";

export function LaunchPanel({ code, room }: { code: string; room: RoomDetails }) {
  return (
    <section className="panel launch-panel panel-frame">
      <div className="section-title">
        <div>
          <p className="eyebrow">CHOOSE THIS DEVICE</p>
          <h2>How are you playing?</h2>
        </div>
      </div>
      <ScrollArea className="panel-scroll" ariaLabel="Play modes">
        <div className="panel-scroll__content">
          <div className="launch-grid">
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
                  TV or laptop becomes the display; phones become controllers automatically.
                  Connected remotes are discovered live and the game chooses shared or split screen.
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
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

function orientationCopy(orientation: RoomDetails["preferredOrientation"]): string {
  if (orientation === "landscape") return "Designed for a PSP-style landscape layout.";
  if (orientation === "portrait") return "Designed for a Game Boy-style portrait layout.";
  return "Portrait feels like Game Boy; landscape rearranges like PSP.";
}
