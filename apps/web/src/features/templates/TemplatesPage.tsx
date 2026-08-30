import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import { SkeletonBlock } from "../../shared/Skeleton";
import type { CurrentUser } from "../../shared/types";

const TEMPLATE_SKELETON_KEYS = ["template-a", "template-b", "template-c"] as const;

export function TemplatesPage({ user }: { user: CurrentUser }) {
  const templatesResult = useQuery(api.templates.listPublished);
  const ownedResult = useQuery(api.templates.listMine);
  const templates = templatesResult ?? [];
  const owned = ownedResult ?? [];
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
    <main className="app-shell template-page">
      <header className="topbar desktop-topbar">
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

      <ScrollArea className="template-page__scroll" ariaLabel="Game source marketplace">
        <div className="template-page__content">
          <section className="page-heading template-heading">
            <div>
              <p className="eyebrow">SOURCE MARKETPLACE</p>
              <h1>Own the game source, not the platform runtime.</h1>
              <p>
                Each template is independently versioned. Buying a template grants its private
                source package; public gameplay remains isolated from platform updates.
              </p>
            </div>
            <div className="template-stat">
              <strong>{ownedResult === undefined ? "—" : owned.length}</strong>
              <span>owned</span>
            </div>
          </section>

          {error && (
            <p className="global-error" role="alert">
              {error}
            </p>
          )}

          <section className="template-grid" aria-label="Published game templates">
            {templatesResult === undefined
              ? TEMPLATE_SKELETON_KEYS.map((key) => <TemplateSkeleton key={key} />)
              : templates.map((template) => {
                  const isOwned = ownedIds.has(template.id);
                  return (
                    <article
                      className="panel template-card"
                      key={`${template.slug}@${template.version}`}
                    >
                      <img
                        className="template-preview"
                        src={`/game-previews/${template.previewGameId}.png`}
                        alt={`${template.title} gameplay preview`}
                        loading="lazy"
                        decoding="async"
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
            {templatesResult !== undefined && !templates.length && (
              <div className="panel empty-state template-empty">
                <strong>No source templates are published yet.</strong>
                <p>Playable games remain available from the lobby.</p>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}

function TemplateSkeleton() {
  return (
    <article className="panel template-card template-card--skeleton" aria-hidden="true">
      <SkeletonBlock className="template-preview" />
      <div className="template-card__body">
        <SkeletonBlock width="42%" height={10} />
        <SkeletonBlock width="72%" height={24} />
        <SkeletonBlock width="94%" height={10} />
        <SkeletonBlock width="81%" height={10} />
        <SkeletonBlock width="100%" height={42} />
      </div>
    </article>
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
