import { ScrollArea } from "../../../shared/ScrollArea";
import { SkeletonBlock } from "../../../shared/Skeleton";
import { Button } from "../../../shared/ui/Button";
import { FormMessage } from "../../../shared/ui/FormMessage";
import { SectionTitle } from "../../../shared/ui/SectionTitle";

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
      <SectionTitle
        label="BASE PROMPT"
        title="Rules → implementation → tests → publish"
        meta={prompt ? `${prompt.length.toLocaleString()} chars` : "Loading"}
      />
      <ScrollArea className="developer-prompt-scroll" ariaLabel="Full game submission prompt">
        {prompt ? (
          <pre className="developer-prompt">{prompt}</pre>
        ) : error ? (
          <FormMessage>The generated prompt file is unavailable. Run pnpm docs:sync.</FormMessage>
        ) : (
          <div className="developer-prompt-skeleton">
            {SKELETON_KEYS.map((key, index) => (
              <SkeletonBlock key={key} width={`${70 + ((index * 11) % 28)}%`} height={10} />
            ))}
          </div>
        )}
      </ScrollArea>
      <Button type="button" fullWidth disabled={!prompt} onClick={onCopy}>
        {copied ? "Copied to clipboard" : "Copy complete prompt"}
      </Button>
    </section>
  );
}
