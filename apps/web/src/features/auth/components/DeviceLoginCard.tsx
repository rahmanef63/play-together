import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { formatDeviceCode } from "../model/deviceProof";
import { useDeviceLogin } from "../model/useDeviceLogin";

export function DeviceLoginCard() {
  const login = useDeviceLogin();
  const [image, setImage] = useState(""),
    [now, setNow] = useState(Date.now()),
    [imageError, setImageError] = useState(false);
  const challenge = login.challenge;
  const code = challenge?.code;
  const link = code ? `${window.location.origin}/device?pair=${encodeURIComponent(code)}` : "";
  useEffect(() => {
    let active = true;
    setImage("");
    setImageError(false);
    if (link)
      void QRCode.toDataURL(link, { width: 256, margin: 3, errorCorrectionLevel: "M" }).then(
        (data) => {
          if (active) setImage(data);
        },
        () => {
          if (active) setImageError(true);
        },
      );
    return () => {
      active = false;
    };
  }, [link]);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);
  const seconds = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const active = Boolean(
    challenge && ["pending", "signing-in"].includes(login.phase) && seconds > 0,
  );
  return (
    <section className="device-login-card" aria-label="QR sign-in">
      <p className="eyebrow">BRING YOUR PLAYER PROFILE</p>
      <h2>Sign in with another device</h2>
      <p>
        Scan using a phone that is already signed in to Play Together. Match the code, then approve
        this screen.
      </p>
      {active ? (
        <>
          <div className="device-qr">
            {image ? (
              <img
                src={image}
                alt="Scan to approve sign-in on this device"
                width={192}
                height={192}
              />
            ) : (
              <span>{imageError ? "Use the code below" : "Preparing QR…"}</span>
            )}
          </div>
          <strong className="device-code" data-pairing-code={code}>
            {formatDeviceCode(code ?? "")}
          </strong>
          <p className="device-expiry" role="status">
            {login.phase === "signing-in"
              ? "Approved. Signing in…"
              : `Waiting for approval · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
          </p>
          <p className="device-manual">
            Or open <strong>{window.location.host}/device</strong> and enter the code.
          </p>
        </>
      ) : (
        <div className="device-start">
          <div className="device-qr-placeholder" aria-hidden="true">
            ▦
          </div>
          {login.phase !== "idle" && (
            <p role="status">
              {login.error ||
                (login.phase === "denied"
                  ? "This request was declined."
                  : login.phase === "creating"
                    ? "Creating a secure request…"
                    : "This code is no longer active.")}
            </p>
          )}
          <Button
            type="button"
            busy={login.phase === "creating"}
            onClick={() => void login.generate()}
          >
            {login.phase === "idle" ? "Show sign-in QR" : "Create a new code"}
          </Button>
        </div>
      )}
      <p className="microcopy">
        The QR is not a login token. Approval expires in five minutes and works once.
      </p>
    </section>
  );
}
