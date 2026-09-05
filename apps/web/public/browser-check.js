/* ES5 boot guard: this must execute even when the application module cannot parse. */
function ptCheckBrowserCompatibility() {
  window.__PT_BOOTED__ = false;
  window.__PT_GAME_SYNTAX__ = false;
  var hasModules = "noModule" in document.createElement("script");
  var missing = [];
  if (!hasModules) missing.push("JavaScript modules");
  if (!window.fetch || !window.Promise) missing.push("modern network APIs");
  if (!window.crypto || !window.crypto.subtle) missing.push("secure cryptography");
  if (!window.WebSocket) missing.push("WebSocket connections");
  if (typeof BigInt === "undefined") missing.push("BigInt support");
  window.__PT_BOOT_MISSING__ = missing;
  function explain() {
    if (window.__PT_BOOTED__) return;
    var heading = document.getElementById("boot-title"),
      text = document.getElementById("boot-message");
    if (heading)
      heading.textContent = missing.length
        ? "This TV browser needs an update"
        : "Play Together could not start";
    if (text)
      text.textContent = missing.length
        ? "Missing: " + missing.join(", ") + ". Open the TV check below."
        : "Check your connection, reload, or run the TV compatibility check.";
  }
  if (missing.length) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", explain);
    else explain();
  } else window.setTimeout(explain, 15000);
}
ptCheckBrowserCompatibility();
