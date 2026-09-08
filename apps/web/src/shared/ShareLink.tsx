import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import "./ShareLink.css";

type ShareProps = { url: string; title: string; label?: string };
export function ShareLink(props: ShareProps) {
  return <ShareActions key={props.url} {...props} />;
}
function ShareActions({ url, title, label = "Copy invite" }: ShareProps) {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      if (mounted.current) {
        setMessage("Invitation link copied");
        setManual(false);
      }
    } catch {
      if (mounted.current) {
        setManual(true);
        setMessage("Select the link below to copy it manually.");
      }
    }
  };
  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await navigator.share({ title, url });
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError") && mounted.current) {
        setManual(true);
        setMessage("Sharing is unavailable. Copy the invitation link below.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="share-link">
      <div className="share-link__actions">
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {label}
        </Button>
        {typeof navigator.share === "function" && (
          <Button type="button" variant="secondary" busy={busy} onClick={() => void share()}>
            Share…
          </Button>
        )}
      </div>
      <p className="share-link__status" role="status">
        {message}
      </p>
      {manual && (
        <label className="share-link__manual">
          Invitation link
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </div>
  );
}
