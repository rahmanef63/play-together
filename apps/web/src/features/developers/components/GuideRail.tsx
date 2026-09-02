import { HorizontalSnap } from "../../../shared/ui/HorizontalSnap";

const GUIDES = [
  [
    "01",
    "One vertical slice",
    "Create games/<game-id>/ only. Identity, version, player limits, modes, orientation, and controls live in game.config.json.",
  ],
  [
    "02",
    "Manifest-native console",
    "Use only the stick, D-pad, face buttons, shoulders, triggers, or touch surface the game needs. No portal name heuristics.",
  ],
  [
    "03",
    "Server authority",
    "Controllers send intent. The room worker decides collision, score, health, inventory, timers, wins, and every trusted state transition.",
  ],
  [
    "04",
    "Immutable publish",
    "Any byte-changing update after publish needs a new semantic game version. Historical manifests and bundles are never overwritten.",
  ],
  [
    "05",
    "Adaptive TV layout",
    "Declare shared or per-player presentation. The platform discovers remotes and composes up to four views; per-player displays focus with ctx.playerId.",
  ],
] as const;

export function GuideRail() {
  return (
    <HorizontalSnap as="section" className="developer-card-rail" ariaLabel="Submission rules">
      {GUIDES.map(([index, title, body]) => (
        <article className="developer-guide-card" key={index}>
          <span>{index}</span>
          <strong>{title}</strong>
          <p>{body}</p>
        </article>
      ))}
    </HorizontalSnap>
  );
}
