export interface BrowserSupport {
  modules: boolean;
  secureCrypto: boolean;
  sockets: boolean;
  gameSyntax: boolean;
  webgl2: boolean;
  tv: boolean;
}
declare global {
  interface Window {
    __PT_GAME_SYNTAX__?: boolean;
    __PT_BOOTED__?: boolean;
  }
}
let cached: BrowserSupport | undefined;
export function browserSupport(): BrowserSupport {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  let webgl2 = false;
  try {
    const gl = canvas.getContext("webgl2");
    webgl2 = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* unsupported GPU */
  }
  cached = {
    modules: "noModule" in document.createElement("script"),
    secureCrypto: Boolean(globalThis.crypto?.subtle),
    sockets: typeof WebSocket === "function",
    gameSyntax: window.__PT_GAME_SYNTAX__ !== false,
    webgl2,
    tv:
      /SmartTV|Smart-TV|Tizen|Web0S|WebOS|HbbTV|NetCast/i.test(navigator.userAgent) ||
      new URLSearchParams(location.search).get("tv") === "1",
  };
  return cached;
}
export function displayCompatibilityMessage(support = browserSupport()): string | null {
  if (!support.secureCrypto || !support.sockets || !support.modules)
    return "This browser is missing secure connection features required to play.";
  if (!support.gameSyntax)
    return "The lobby and QR sign-in can work here, but this browser cannot run the current 3D game engine. Update the TV browser or connect a current device by HDMI.";
  if (!support.webgl2)
    return "This screen does not provide WebGL 2. You can use it as a remote, or show the game from a current device connected by HDMI.";
  return null;
}
export function secureChannelId(): string {
  const values = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}
