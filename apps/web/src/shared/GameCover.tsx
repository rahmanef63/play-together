import { useState } from "react";
import "./GameCover.css";
export function GameCover({
  gameId,
  version,
  title,
  className = "",
  eager = false,
}: {
  gameId: string;
  version: string;
  title: string;
  className?: string;
  eager?: boolean;
}) {
  const src = `/game-previews/${encodeURIComponent(gameId)}.webp?v=${encodeURIComponent(version)}`;
  const [failedSrc, setFailedSrc] = useState("");
  return failedSrc === src ? (
    <div
      className={`game-cover-fallback ${className}`}
      role="img"
      aria-label={`${title}: preview unavailable`}
    >
      <span>{title}</span>
    </div>
  ) : (
    <img
      className={className}
      src={src}
      alt={`${title} gameplay`}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedSrc(src)}
    />
  );
}
