export const TURBO_HUD_CSS = `
.turbo-circuit{position:relative;width:100%;height:100%;min-width:0;min-height:0;container:turbo / size;overflow:hidden;background:#111;color:#fff;font-family:system-ui,sans-serif}
.turbo-circuit__canvas{display:block;width:100%;height:100%}
.turbo-race-status,.turbo-camera,.turbo-wrong-way,.turbo-pause,.turbo-nitro{position:absolute;z-index:8;pointer-events:none;color:#fff;text-shadow:0 2px 4px #000}
.turbo-race-status{left:8px;top:8px;max-width:calc(100% - 72px);font:900 clamp(11px,2cqw,16px)/1.2 system-ui}
.turbo-camera{left:8px;top:32px;color:#cfedf4;font:800 10px/1.2 system-ui}
.turbo-wrong-way{left:50%;top:24%;transform:translateX(-50%);padding:6px 10px;background:#a9142ddd;font:900 12px/1 system-ui;opacity:0}
.turbo-pause{left:50%;top:50%;transform:translate(-50%,-50%);padding:12px 18px;border:2px solid #f0c85f;background:#090b0ee8;font:900 18px/1 system-ui;opacity:0}
.turbo-speedometer{position:absolute;z-index:8;left:8px;bottom:8px;display:flex;align-items:baseline;gap:4px;padding:5px 8px;background:#0b0d10d9;border-radius:4px;pointer-events:none}
.turbo-speedometer__needle{display:none}
.turbo-speedometer__value{font:900 clamp(18px,3.5cqw,28px)/1 system-ui}
.turbo-speedometer small{font:800 9px/1 system-ui;color:#d7d1c4}
.turbo-nitro{right:8px;bottom:8px;max-width:calc(100% - 108px);padding:6px 8px;background:#0b0d10d9;border-radius:4px;font:850 11px/1.3 system-ui;text-align:right}
.turbo-minimap{position:absolute;z-index:8;right:8px;top:54px;width:clamp(68px,17cqw,132px);aspect-ratio:1.45;background:#080b10b8;border:1px solid #ffffff2b;padding:3px}
.turbo-results{position:absolute;z-index:13;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92%,440px);max-height:94%;overflow:auto;touch-action:pan-y;padding:12px;background:#10141af5;border:2px solid #e8dfc8;color:#f5f0e5;display:none}
.turbo-results h2{margin:0 0 8px;font:900 clamp(18px,4cqw,28px)/1 system-ui}
.turbo-results__body{white-space:pre-line;font:800 12px/1.45 system-ui}
.turbo-results p{margin:8px 0 0;color:#c8d0d7;font:800 10px/1.4 system-ui}
.turbo-sound{position:absolute;z-index:15;right:6px;top:4px;min-width:44px;min-height:44px;padding:5px;border:1px solid #ffffff38;border-radius:5px;background:#0a0d11d9;color:#e9e3d4;font:850 9px/1 system-ui;cursor:pointer}
.turbo-sound:focus-visible,.turbo-minimap:focus-visible{outline:2px solid #77e2ff;outline-offset:1px}
.turbo-circuit[data-phase="setup"] .turbo-sound{display:none}
.turbo-circuit[data-phase="setup"] .turbo-camera,
.turbo-circuit[data-phase="setup"] .turbo-minimap{visibility:hidden}
@container turbo (max-height:300px) {
 .turbo-minimap{width:70px;top:52px}
 .turbo-race-status{font-size:11px}
 .turbo-speedometer__value{font-size:20px}
 .turbo-nitro{font-size:10px}
 .turbo-results{padding:8px}
 .turbo-results__body{font-size:11px;line-height:1.3}
}
`;
