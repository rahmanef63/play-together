// A nested frame checks every ancestor, not only the immediate MSO component.
// ChatGPT-hosted components can use app-specific subdomains of its sandbox host.
// Scope that host family to /embed only; this is framing permission, not auth trust.
export const EMBED_ANCESTORS = Object.freeze([
  "https://mso-ui.rahmanef.com",
  "https://chatgpt.com",
  "https://web-sandbox.oaiusercontent.com",
  "https://*.web-sandbox.oaiusercontent.com",
]);

export function isEmbedPath(pathname) {
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

export function embedContentSecurityPolicy(policy) {
  const directives = policy
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  return [
    ...directives.filter((item) => !item.startsWith("frame-ancestors ")),
    `frame-ancestors 'self' ${EMBED_ANCESTORS.join(" ")}`,
  ].join("; ");
}
