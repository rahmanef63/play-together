/* Standalone ES5 diagnostics for browsers which cannot boot the application. */
function ptShowBrowserDiagnostics() {
  var canvas = document.createElement("canvas"),
    webgl2 = false;
  try {
    webgl2 = !!canvas.getContext("webgl2");
  } catch (_) {}
  var checks = [
    ["Secure connection", window.location.protocol === "https:"],
    ["JavaScript modules", "noModule" in document.createElement("script")],
    ["Secure sign-in / integrity", !!(window.crypto && window.crypto.subtle)],
    ["Live connection", !!window.WebSocket],
    ["BigInt", typeof BigInt !== "undefined"],
    ["WebGL 2 graphics", webgl2],
  ];
  var list = document.getElementById("tv-checks");
  var i, row;
  for (i = 0; i < checks.length; i++) {
    row = document.createElement("li");
    row.textContent = checks[i][0] + ": " + (checks[i][1] ? "Available" : "Not available");
    list.appendChild(row);
  }
  document.getElementById("tv-browser").textContent = navigator.userAgent;
}
ptShowBrowserDiagnostics();
