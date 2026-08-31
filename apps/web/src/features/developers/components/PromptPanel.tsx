import { ScrollArea } from "../../../shared/ScrollArea";
import { SkeletonBlock } from "../../../shared/Skeleton";

const SKELETON_KEYS = Array.from({ length: 12 }, (_, index) => `prompt-${index}`);

export function PromptPanel({
  prompt,
  error,
  copied,
  onCopy,
}: {
  prompt: string;
  error: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="panel developer-panel developer-panel--prompt">
      <div className="section-title">
        <div>
          <p className="eyebrow">BASE PROMPT</p>
          <h2>Rules → implementation → tests → publish</h2>
        </div>
        <span>{prompt ? `${prompt.length.toLocaleString()} chars` : "Loading"}</span>
      </div>
      <ScrollArea className="developer-prompt-scroll" ariaLabel="Full game submission prompt">
        {prompt ? (
          <pre className="developer-prompt">{prompt}</pre>
        ) : error ? (
          <p className="form-error">
            The generated prompt file is unavailable. Run pnpm docs:sync.
          </p>
        ) : (
          <div className="developer-prompt-skeleton">
            {SKELETON_KEYS.map((key, index) => (
              <SkeletonBlock key={key} width={`${70 + ((index * 11) % 28)}%`} height={10} />
            ))}
          </div>
        )}
      </ScrollArea>
      <button className="primary-button full" type="button" disabled={!prompt} onClick={onCopy}>
        {copied ? "Copied to clipboard" : "Copy complete prompt"}
      </button>
    </section>
  );
}
