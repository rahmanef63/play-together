import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import type { CurrentUser } from "../../shared/types";

export function TemplatesPage({ user }: { user: CurrentUser }) {
  const templates = useQuery(api.templates.listPublished) ?? [];
  const owned = useQuery(api.templates.listMine) ?? [];
  const claimPending = useMutation(api.templates.claimPendingPurchases);
  const issueDownload = useAction(api.templates.issueDownload);
  const [busyTemplateId, setBusyTemplateId] = useState("");
  const [error, setError] = useState("");
  const ownedIds = useMemo(() => new Set(owned.map((item) => item.templateId)), [owned]);

  useEffect(() => {
    void claimPending({}).catch(() => undefined);
  }, [claimPending]);

  const download = async (templateId: (typeof templates)[number]["id"]) => {
    setBusyTemplateId(templateId);
    setError("");
    try {
      const result = await issueDownload({ templateId });
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Template download is unavailable");
    } finally {
      setBusyTemplateId("");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <nav>
          <button className="ghost-button" type="button" onClick={() => navigate("/")}>
            Lobby
          </button>
          <span className="template-user">{user.name}</span>
        </nav>
      </header>

      <section className="page-heading template-heading">
        <div>
          <p className="eyebrow">SOURCE MARKETPLACE</p>
          <h1>Own the game source, not the platform runtime.</h1>
          <p>
            Each template is independently versioned. Buying a template grants its private source
            package; public gameplay remains isolated from platform updates.
          </p>
        </div>
        <div className="template-stat">
          <strong>{owned.length}</strong>
          <span>owned</span>
        </div>
      </section>

      {error && (
        <p className="global-error" role="alert">
          {error}
        </p>
      )}

      <section className="template-grid" aria-label="Published game templates">
        {templates.map((template) => {
          const isOwned = ownedIds.has(template.id);
          return (
            <article className="panel template-card" key={`${template.slug}@${template.version}`}>
              <img
                className="template-preview"
                src={`/game-previews/${template.previewGameId}.png`}
                alt={`${template.title} gameplay preview`}
                loading="lazy"
              />
              <div className="template-card__body">
                <div className="template-card__meta">
                  <code>
                    {template.slug}@{template.version}
                  </code>
                  {template.licenseId && <span>{template.licenseId}</span>}
                </div>
                <h2>{template.title}</h2>
                <p>{template.summary}</p>
                <div className="template-card__footer">
                  <strong>{formatPrice(template.priceMinor, template.currency)}</strong>
                  {isOwned ? (
                    <button
                      className="primary-button"
                      type="button"
                      disabled={busyTemplateId === template.id}
                      onClick={() => void download(template.id)}
                    >
                      {busyTemplateId === template.id ? "Preparing…" : "Download source"}
                    </button>
                  ) : template.purchaseUrl ? (
                    <a
                      className="primary-button template-buy-link"
                      href={template.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buy source
                    </a>
                  ) : (
                    <span className="status-badge">Not listed for checkout</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!templates.length && (
          <div className="panel empty-state template-empty">
            <strong>No source templates are published yet.</strong>
            <p>Playable games remain available from the lobby.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function formatPrice(value?: number, currency?: string): string {
  if (value === undefined || !currency) return "Unpriced";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${currency} ${(value / 100).toLocaleString()}`;
  }
}
