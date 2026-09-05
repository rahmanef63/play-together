import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";

const QRCode = createRequire(new URL("../../apps/web/package.json", import.meta.url))("qrcode");

export async function requestPairCode(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "QR sign-in", exact: true }).click();
  await page.getByRole("button", { name: "Show sign-in QR" }).click();
  const element = page.locator("[data-pairing-code]");
  await expect(element).toBeVisible();
  const code = await element.getAttribute("data-pairing-code");
  if (!code) throw new Error("The requesting screen did not generate a code");
  return code;
}

export async function qrPhoto(value: string): Promise<Buffer> {
  return QRCode.toBuffer(value, { width: 512, margin: 4, errorCorrectionLevel: "M" });
}

/** A generated QR is streamed through a canvas; the app still executes its real jsQR decoder. */
export async function installCameraFixture(page: Page, value: string): Promise<void> {
  const imageData = await QRCode.toDataURL(value, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  await page.addInitScript(
    ({ imageData }) => {
      const stats = { requests: 0, stopped: 0, audio: undefined as unknown };
      (window as any).__cameraFixture = stats;
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async (constraints: MediaStreamConstraints) => {
          stats.requests++;
          stats.audio = constraints.audio;
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("fixture image failed"));
            image.src = imageData;
          });
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          canvas.getContext("2d")!.drawImage(image, 0, 0);
          const stream = canvas.captureStream(10);
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              stats.stopped++;
              stop();
            };
          }
          return stream;
        },
      });
    },
    { imageData },
  );
}
