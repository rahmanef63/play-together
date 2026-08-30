import { useEffect, useState } from "react";
import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import { SkeletonBlock } from "../../shared/Skeleton";
import type { CurrentUser } from "../../shared/types";

const PROMPT_SKELETON_KEYS = [
  "line-a",
  "line-b",
  "line-c",
  "line-d",
  "line-e",
  "line-f",
  "line-g",
  "line-h",
  "line-i",
  "line-j",
  "line-k",
  "line-l",
] as const;

const TOOL_ROWS = [
  ["game_list", "Discover every game slice and its immutable release state."],
  ["game_get", "Read one game config, package metadata, controls, and release history."],
  ["game_create", "Create a validated games/<id>/ vertical slice from structured input."],
  [
    "game_update",
    "Patch one draft/versioned game safely; published byte changes require a new version.",
  ],
  [
    "game_delete",
    "Delete only an unpublished draft. Published releases can never be removed by this tool.",
  ],
  ["game_validate", "Run discovery, typecheck, unit tests, and a game build without publishing."],
  [
    "game_publish",
    "Create the local immutable release; production registration remains CI-controlled.",
  ],
  ["game_registry", "Regenerate the portal registry from game configs."],
  ["game_prompt", "Return the same full submission prompt shown on this page."],
] as const;

export function DevelopersPage({ user }: { user: CurrentUser }) {
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptError, setPromptError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/docs/submitting-games.prompt.txt", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Prompt document is unavailable");
        return response.text();
      })
      .then((text) => setPrompt(text.trim()))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setPromptError(true);
      });
    return () => controller.abort();
  }, []);

  const copyPrompt = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_700);
  };

  return (
    <main className="app-shell developer-page">
      <header className="topbar desktop-topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <nav>
          <button className="ghost-button" type="button" onClick={() => navigate("/templates")}>
            Templates
          </button>
          <span className="template-user">{user.name}</span>
        </nav>
      </header>

      <ScrollArea className="developer-page__scroll" ariaLabel="Game developer guide">
        <div className="developer-page__content">
          <section className="developer-hero">
            <div>
              <p className="eyebrow">GAME SUBMISSION KIT</p>
              <h1>Describe the game. Keep the platform architecture automatic.</h1>
              <p>
                Every game remains one isolated slice. The manifest defines the console, the server
                owns trusted gameplay, and CI owns immutable production publishing.
              </p>
            </div>
            <div className="developer-hero__actions">
              <button
                className="primary-button"
                type="button"
                disabled={!prompt}
                onClick={() => void copyPrompt()}
              >
                {copied ? "Prompt copied" : "Copy full submission prompt"}
              </button>
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

          <section className="developer-card-rail" aria-label="Submission rules">
            <GuideCard
              index="01"
              title="One vertical slice"
              body="Create games/<game-id>/ only. Identity, version, player limits, modes, orientation, and controls live in game.config.json."
            />
            <GuideCard
              index="02"
              title="Manifest-native console"
              body="Use only the stick, D-pad, face buttons, shoulders, triggers, or touch surface the game needs. No portal name heuristics."
            />
            <GuideCard
              index="03"
              title="Server authority"
              body="Controllers send intent. The room worker decides collision, score, health, inventory, timers, wins, and every trusted state transition."
            />
            <GuideCard
              index="04"
              title="Immutable publish"
              body="Any byte-changing update after publish needs a new semantic game version. Historical manifests and bundles are never overwritten."
            />
          </section>

          <div className="developer-grid">
            <section className="panel developer-panel developer-panel--prompt">
              <div className="section-title">
                <div>
                  <p className="eyebrow">BASE PROMPT</p>
                  <h2>Rules → implementation → tests → publish</h2>
                </div>
                <span>{prompt ? `${prompt.length.toLocaleString()} chars` : "Loading"}</span>
              </div>
              <ScrollArea
                className="developer-prompt-scroll"
                ariaLabel="Full game submission prompt"
              >
                {prompt ? (
                  <pre className="developer-prompt">{prompt}</pre>
                ) : promptError ? (
                  <p className="form-error">
                    The generated prompt file is unavailable. Run pnpm docs:sync.
                  </p>
                ) : (
                  <div className="developer-prompt-skeleton">
                    {PROMPT_SKELETON_KEYS.map((key, index) => (
                      <SkeletonBlock key={key} width={`${70 + ((index * 11) % 28)}%`} height={10} />
                    ))}
                  </div>
                )}
              </ScrollArea>
              <button
                className="primary-button full"
                type="button"
                disabled={!prompt}
                onClick={() => void copyPrompt()}
              >
                {copied ? "Copied to clipboard" : "Copy complete prompt"}
              </button>
            </section>

            <aside className="panel developer-panel developer-panel--tools">
              <div className="section-title">
                <div>
                  <p className="eyebrow">MCP + TOOL CALLING</p>
                  <h2>Game CRUD without shell interpolation</h2>
                </div>
                <span>{TOOL_ROWS.length} tools</span>
              </div>
              <p className="developer-tools-intro">
                The repository ships a stdio MCP server in <code>.mcp.json</code> and the same
                bounded operations through
                <code>.mso/functions.json</code>. Production credentials are intentionally not
                exposed to either surface.
              </p>
              <div className="developer-tool-list">
                {TOOL_ROWS.map(([name, description]) => (
                  <article key={name}>
                    <code>{name}</code>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
              <div className="developer-command-card">
                <span>Manual MCP server</span>
                <code>pnpm mcp:game</code>
              </div>
              <div className="developer-command-card">
                <span>Validate all repository gates</span>
                <code>pnpm verify</code>
              </div>
            </aside>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}

function GuideCard({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <article className="developer-guide-card">
      <span>{index}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}
