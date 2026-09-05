import { useCallback, useEffect, useRef, useState } from "react";
import { cameraAvailability, cameraFailure, stopCamera } from "./camera";
import { decodeQrFile, decodeQrImage } from "./qrDecoder";
export function QrScanner({
  onRead,
  onClose,
}: {
  onRead: (value: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef(0),
    generation = useRef(0);
  const [state, setState] = useState("idle"),
    [error, setError] = useState("");
  const stop = useCallback(() => {
    generation.current++;
    window.clearTimeout(timer.current);
    stopCamera(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        stop();
        setState("idle");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stop]);
  async function start() {
    stop();
    setError("");
    const unavailable = cameraAvailability();
    if (unavailable) {
      setError(unavailable);
      return;
    }
    const turn = generation.current;
    setState("opening");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (turn !== generation.current || !video.current) {
        stopCamera(media);
        return;
      }
      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      if (turn !== generation.current) return;
      setState("scanning");
      const read = () => {
        if (turn !== generation.current || !video.current) return;
        try {
          const raw =
            video.current.readyState >= 2
              ? decodeQrImage(video.current, video.current.videoWidth, video.current.videoHeight)
              : null;
          if (raw) {
            stop();
            setState("idle");
            onRead(raw);
            return;
          }
        } catch {
          /* Wait for a usable video frame; manual and photo remain available. */
        }
        timer.current = window.setTimeout(read, 220);
      };
      read();
    } catch (reason) {
      if (turn === generation.current) {
        stop();
        setState("idle");
        setError(cameraFailure(reason));
      }
    }
  }
  async function readPhoto(file: File | undefined) {
    if (!file) return;
    stop();
    setState("reading");
    setError("");
    const turn = generation.current;
    try {
      const result = await decodeQrFile(file);
      if (turn !== generation.current) return;
      if (!result) {
        setError(
          "No readable QR found. Choose a clear photo with the whole code, or enter it manually.",
        );
        return;
      }
      onRead(result);
    } catch {
      if (turn === generation.current)
        setError("Choose a clear JPG, PNG or WebP image under 12 MB.");
    } finally {
      if (turn === generation.current) setState("idle");
    }
  }
  return (
    <section className="qr-scanner" aria-label="Scan a sign-in QR">
      <header>
        <h2>Scan the other screen</h2>
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
        >
          Close scanner
        </button>
      </header>
      <div className="qr-viewfinder" data-state={state}>
        <video ref={video} muted playsInline aria-label="Local camera preview" />
        <div className="qr-scan-guide" aria-hidden="true" />
        {state !== "scanning" && (
          <p>
            {state === "opening"
              ? "Waiting for camera permission…"
              : state === "reading"
                ? "Reading your photo…"
                : "Point your phone at the sign-in QR."}
          </p>
        )}
      </div>
      <div className="scanner-actions">
        <button
          type="button"
          className="primary-button"
          disabled={state === "opening" || state === "reading"}
          onClick={() => {
            if (state === "scanning") {
              stop();
              setState("idle");
            } else void start();
          }}
        >
          {state === "scanning" ? "Stop camera" : "Open camera"}
        </button>
        <label className="scanner-file">
          Choose QR photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(event) => {
              void readPhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error && (
        <p className="scanner-error" role="alert">
          {error}
        </p>
      )}
      {window.parent !== window && (
        <a href={`${location.origin}/device`} target="_blank" rel="noopener noreferrer">
          Open scanner in browser
        </a>
      )}
      <p className="scanner-privacy">
        Camera and photos are read on this device. Nothing is recorded or uploaded.
      </p>
    </section>
  );
}
