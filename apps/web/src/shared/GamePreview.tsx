import { useState } from "react";
import { GameCover } from "./GameCover";
import "./GamePreview.css";
export function GamePreview({
  gameId,
  version,
  title,
}: {
  gameId: string;
  version: string;
  title: string;
}) {
  return (
    <PreviewPlayer key={`${gameId}@${version}`} gameId={gameId} version={version} title={title} />
  );
}
function PreviewPlayer({
  gameId,
  version,
  title,
}: {
  gameId: string;
  version: string;
  title: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [failed, setFailed] = useState(false);
  const playing = (hovered || pinned) && !failed;
  return (
    <div
      className="game-preview"
      onPointerEnter={(event) => {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection;
        if (
          event.pointerType === "mouse" &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches &&
          !connection?.saveData
        )
          setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <GameCover
        gameId={gameId}
        version={version}
        title={title}
        className="game-stage__image"
        eager
      />
      {playing && (
        <video
          className="game-stage__image game-preview__video"
          src={`/game-previews/${encodeURIComponent(gameId)}.mp4?v=${encodeURIComponent(version)}`}
          aria-label={`${title} gameplay preview`}
          autoPlay
          muted
          loop
          playsInline
          onError={() => {
            setFailed(true);
            setHovered(false);
            setPinned(false);
          }}
        />
      )}
      <button
        className="game-preview__toggle"
        type="button"
        aria-pressed={playing}
        aria-label={failed ? "Preview unavailable" : playing ? "Pause preview" : "Preview gameplay"}
        disabled={failed}
        onClick={() => {
          setHovered(false);
          setPinned(!playing);
        }}
      >
        <span className="game-preview__icon" aria-hidden="true">
          {failed ? "!" : playing ? "Ⅱ" : "▶"}
        </span>
        <span className="game-preview__label">
          {failed ? "Preview unavailable" : playing ? "Pause preview" : "Preview gameplay"}
        </span>
      </button>
    </div>
  );
}
