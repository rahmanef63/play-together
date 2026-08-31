const TOOLS = [
  ["game_list", "Discover every game slice and its immutable release state."],
  ["game_get", "Read one game config, package metadata, controls, and release history."],
  ["game_create", "Create a validated games/<id>/ vertical slice from structured input."],
  [
    "game_update",
    "Patch one game safely; cartridge byte changes need a new version, host display policy does not.",
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

export function ToolsPanel() {
  return (
    <aside className="panel developer-panel developer-panel--tools">
      <div className="section-title">
        <div>
          <p className="eyebrow">MCP + TOOL CALLING</p>
          <h2>Game CRUD without shell interpolation</h2>
        </div>
        <span>{TOOLS.length} tools</span>
      </div>
      <p className="developer-tools-intro">
        The repository ships a stdio MCP server in <code>.mcp.json</code> and the same bounded
        operations through <code>.mso/functions.json</code>. Production credentials are
        intentionally not exposed to either surface.
      </p>
      <div className="developer-tool-list">
        {TOOLS.map(([name, description]) => (
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
  );
}
