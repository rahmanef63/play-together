import { toDataURL } from "qrcode";
import { useEffect, useState } from "react";

export function RoomInviteQr({ code, compact = false }: { code: string; compact?: boolean }) {
  const inviteUrl = `${location.origin}/room/${code}?join=remote`;
  const [src, setSrc] = useState("");
  const [generationFailed, setGenerationFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    setGenerationFailed(false);
    void toDataURL(inviteUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: compact ? 220 : 360,
      color: { dark: "#111015", light: "#ffffff" },
    })
      .then((value) => {
        if (!disposed) setSrc(value);
      })
      .catch(() => {
        if (!disposed) setGenerationFailed(true);
      });
    return () => {
      disposed = true;
    };
  }, [compact, inviteUrl]);

  return (
    <div
      className={`room-invite-qr${compact ? " room-invite-qr--compact" : ""}`}
      data-invite-url={inviteUrl}
    >
      <div className="room-invite-qr__image">
        {src ? (
          <img src={src} alt={`QR code to join room ${code} as a remote`} />
        ) : generationFailed ? (
          <span>QR unavailable · use room code {code}</span>
        ) : (
          <span>Generating QR…</span>
        )}
      </div>
      <div className="room-invite-qr__meta">
        <span>SCAN TO JOIN</span>
        <strong>{code}</strong>
        <small>Camera → scan → join → phone becomes the controller</small>
      </div>
    </div>
  );
}
