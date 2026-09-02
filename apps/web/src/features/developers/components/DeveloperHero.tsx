import { Button } from "../../../shared/ui/Button";

export function DeveloperHero({
  promptReady,
  copied,
  onCopy,
}: {
  promptReady: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="developer-hero">
      <div>
        <p className="eyebrow">GAME SUBMISSION KIT</p>
        <h1>Describe the game. Keep the platform architecture automatic.</h1>
        <p>
          Every game remains one isolated slice. The manifest defines the console, the server owns
          trusted gameplay, and CI owns immutable production publishing.
        </p>
      </div>
      <div className="developer-hero__actions">
        <Button type="button" disabled={!promptReady} onClick={onCopy}>
          {copied ? "Prompt copied" : "Copy full submission prompt"}
        </Button>
        <a
          className="secondary-button docs-link"
          href="/docs/submitting-games.md"
          target="_blank"
          rel="noreferrer"
        >
          Open complete repo guide
        </a>
      </div>
    </section>
  );
}
