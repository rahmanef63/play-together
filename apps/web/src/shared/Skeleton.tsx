import type { CSSProperties } from "react";

const PREVIEW_KEYS = [
  "preview-a",
  "preview-b",
  "preview-c",
  "preview-d",
  "preview-e",
  "preview-f",
  "preview-g",
  "preview-h",
] as const;
const ROOM_KEYS = [
  "room-a",
  "room-b",
  "room-c",
  "room-d",
  "room-e",
  "room-f",
  "room-g",
  "room-h",
] as const;

export function SkeletonBlock({
  className = "",
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  const style: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function PreviewCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-preview-rail" aria-hidden="true">
      {PREVIEW_KEYS.slice(0, count).map((key) => (
        <article className="skeleton-preview-card" key={key}>
          <SkeletonBlock className="skeleton-preview-card__image" />
          <SkeletonBlock width="70%" height={12} />
          <SkeletonBlock width="42%" height={9} />
        </article>
      ))}
    </div>
  );
}

export function RoomCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-room-list" aria-hidden="true">
      {ROOM_KEYS.slice(0, count).map((key, index) => (
        <article className="skeleton-room-card" key={key}>
          <div>
            <SkeletonBlock width={`${58 + ((index * 13) % 26)}%`} height={14} />
            <SkeletonBlock width="74%" height={9} />
          </div>
          <SkeletonBlock width={76} height={34} />
        </article>
      ))}
    </div>
  );
}

export function RouteSkeleton() {
  return (
    <main className="app-shell route-skeleton" aria-label="Loading page">
      <div className="route-skeleton__header">
        <SkeletonBlock width={144} height={34} />
        <SkeletonBlock width={42} height={42} />
      </div>
      <div className="route-skeleton__hero">
        <SkeletonBlock width="38%" height={12} />
        <SkeletonBlock width="82%" height={44} />
        <SkeletonBlock width="54%" height={12} />
      </div>
      <div className="route-skeleton__cards">
        <SkeletonBlock className="route-skeleton__card" />
        <SkeletonBlock className="route-skeleton__card" />
      </div>
    </main>
  );
}
