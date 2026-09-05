/** Private proof never appears in the QR, URL, clipboard, messages or persistent storage. */
export function randomDeviceProof(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}
export async function proofDigest(proof: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function deviceClientId(): string {
  try {
    const saved = localStorage.getItem("pt-device-client");
    if (saved && /^[a-f0-9]{32}$/.test(saved)) return saved;
    const id = randomDeviceProof(16);
    localStorage.setItem("pt-device-client", id);
    return id;
  } catch {
    return randomDeviceProof(16);
  }
}
export function deviceLabel(): string {
  return /SmartTV|Smart-TV|Tizen|Web0S|WebOS|HbbTV|NetCast/i.test(navigator.userAgent)
    ? "Living room TV"
    : /Android|iPhone|iPad/i.test(navigator.userAgent)
      ? "Phone or tablet"
      : "Computer browser";
}
