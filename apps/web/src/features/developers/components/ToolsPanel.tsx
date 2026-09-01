import gameToolCatalog from "../../../generated/gameTools.json";

export function ToolsPanel() {
  return (
    <aside className="panel developer-panel developer-panel--tools">
      <div className="section-title">
        <div>
          <p className="eyebrow">MCP + TOOL CALLING</p>
          <h2>Game CRUD without shell interpolation</h2>
        </div>
        <span>{gameToolCatalog.tools.length} tools</span>
      </div>
      <p className="developer-tools-intro">
        The repository ships a stdio MCP server in <code>.mcp.json</code> and the same bounded
        operations through <code>.mso/functions.json</code>. Production credentials are
        intentionally not exposed to either surface.
      </p>
      <div className="developer-tool-list">
        {gameToolCatalog.tools.map(({ name, description }) => (
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
