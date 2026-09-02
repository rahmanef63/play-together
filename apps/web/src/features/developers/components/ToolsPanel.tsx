import gameToolCatalog from "../../../generated/gameTools.json";
import { SectionTitle } from "../../../shared/ui/SectionTitle";

export function ToolsPanel() {
  return (
    <aside className="panel developer-panel developer-panel--tools">
      <SectionTitle
        label="MCP + TOOL CALLING"
        title="Game CRUD without shell interpolation"
        meta={`${gameToolCatalog.tools.length} tools`}
      />
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
