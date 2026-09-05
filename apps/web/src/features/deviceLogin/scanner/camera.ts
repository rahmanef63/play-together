export function cameraAvailability(): string | null {
  if (!globalThis.isSecureContext)
    return "Camera access requires HTTPS. Open the secure Play Together website.";
  const policy = document as Document & {
    permissionsPolicy?: { allowsFeature: (name: string) => boolean };
    featurePolicy?: { allowsFeature: (name: string) => boolean };
  };
  if ((policy.permissionsPolicy ?? policy.featurePolicy)?.allowsFeature("camera") === false)
    return "This embedded preview blocks camera access. Open the scanner in Safari or Chrome, or choose a QR photo below.";
  if (!navigator.mediaDevices?.getUserMedia)
    return "This browser cannot open the camera. Use Safari or Chrome, or choose a QR photo below.";
  return null;
}
export function cameraFailure(reason: unknown): string {
  const name =
    typeof reason === "object" && reason !== null ? (reason as { name?: string }).name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission was not granted. Allow Camera in this site's browser settings, then retry. A QR photo or manual code also works.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera was found. Choose a QR photo or enter the code instead.";
  if (name === "NotReadableError" || name === "AbortError")
    return "The camera is busy. Close another app using it, then retry.";
  return "The camera could not start. Try again or choose a QR photo.";
}
export function stopCamera(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}
