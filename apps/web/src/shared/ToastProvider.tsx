import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ToastNotice {
  title: string;
  description?: string;
  tone?: "error" | "success" | "info";
  reference?: string | undefined;
  action?: { label: string; onClick: () => void };
}
type Item = ToastNotice & { id: number };
const ToastContext = createContext<(notice: ToastNotice) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const sequence = useRef(0);
  const dismiss = useCallback(
    (id: number) => setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback((notice: ToastNotice) => {
    const id = ++sequence.current;
    setItems((current) =>
      [...current.filter((item) => item.title !== notice.title), { ...notice, id }].slice(-3),
    );
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <section className="toast-stack" aria-label="Notifications">
        {items.map((item) => (
          <ToastItem key={item.id} item={item} dismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}
function ToastItem({ item, dismiss }: { item: Item; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismiss(item.id), item.tone === "error" ? 12_000 : 7_000);
    return () => window.clearTimeout(timer);
  }, [item.id, item.tone, paused, dismiss]);
  const reference =
    item.reference && /^[a-f0-9]{16,32}$/i.test(item.reference) ? item.reference : undefined;
  return (
    <article
      className={`toast-card toast-card--${item.tone ?? "info"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div
        className="toast-copy"
        role={item.tone === "error" ? "alert" : "status"}
        aria-atomic="true"
      >
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
      </div>
      <button
        className="toast-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(item.id)}
      >
        ×
      </button>
      {(item.action || reference) && (
        <div className="toast-actions">
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                dismiss(item.id);
              }}
            >
              {item.action.label}
            </button>
          )}
          {reference && (
            <details
              onToggle={(event) => {
                if (event.currentTarget.open) setPaused(true);
              }}
            >
              <summary>Details</summary>
              <span>Support reference</span>
              <code>{reference}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(reference).catch(() => undefined);
                }}
              >
                Copy reference
              </button>
            </details>
          )}
        </div>
      )}
    </article>
  );
}
