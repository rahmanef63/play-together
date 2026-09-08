export const TURBO_SETUP_CSS = `
.turbo-setup{position:absolute;z-index:12;inset:0;display:grid;place-items:center;padding:8px;pointer-events:auto;touch-action:pan-y;background:linear-gradient(180deg,#0a1017a8,#05070bcc)}
.turbo-setup::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(180deg,#ffffff08 0,#ffffff08 1px,transparent 1px,transparent 4px);mix-blend-mode:screen;opacity:.2}
.turbo-setup__panel{position:relative;width:min(100%,760px);min-width:0;max-height:calc(100% - 4px);overflow:auto;scrollbar-width:thin;touch-action:pan-y;overscroll-behavior:contain;background:linear-gradient(145deg,#151b24f5,#0a0e14f8);border:3px solid #ece3ca;box-shadow:10px 10px 0 #0008,0 0 0 1px #000;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));color:#f8f2e4}
.turbo-setup__header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px 12px;border-bottom:1px solid #ffffff22;background:linear-gradient(90deg,#ffffff08,transparent)}
.turbo-setup__eyebrow{display:block;margin-bottom:4px;color:#77e2ff;font:900 9px/1 system-ui;letter-spacing:.18em}
.turbo-setup__header h2{margin:0;font:1000 clamp(23px,4cqw,38px)/.95 system-ui;letter-spacing:-.045em}
.turbo-setup__version{padding:6px 8px;border:1px solid #f0c85f;background:#f0c85f16;color:#f0c85f;font:900 10px/1 system-ui;letter-spacing:.12em}
.turbo-setup__grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:10px;padding:10px}
.turbo-setup__card{position:relative;min-width:0;padding:13px;border:1px solid #ffffff2b;background:#ffffff08;box-shadow:inset 0 0 0 1px #0008;overflow:hidden}
.turbo-setup__card--circuit{background:radial-gradient(circle at 70% 20%,#3ec7ff22,transparent 42%),#ffffff08}
.turbo-setup__card--car{background:radial-gradient(circle at 70% 24%,var(--car-color,#e34245)22,transparent 44%),#ffffff08}
.turbo-setup__kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;color:#9ba5b2;font:900 9px/1 system-ui;letter-spacing:.13em}
.turbo-setup__kicker small{color:#f0c85f;font:900 8px/1 system-ui;letter-spacing:.1em}
.turbo-setup__name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:1000 clamp(18px,3cqw,27px)/1 system-ui;letter-spacing:-.025em}
.turbo-setup__meta{min-height:28px;margin:6px 0 0;color:#c8d0d7;font:800 10px/1.35 system-ui;letter-spacing:.02em}
.turbo-setup__map{height:112px;margin-top:8px;border:1px solid #ffffff1f;background:linear-gradient(#071019cc,#080b10cc);padding:4px}
.turbo-setup__map svg{display:block;width:100%;height:100%}
.turbo-setup__car-preview{position:relative;height:112px;margin-top:8px;border:1px solid #ffffff1f;background:radial-gradient(ellipse at 50% 78%,#ffffff12 0 34%,transparent 35%),linear-gradient(180deg,#101923,#080b10);overflow:hidden}
.turbo-setup__car-preview::before{content:"";position:absolute;left:16%;right:16%;top:28%;height:46%;background:linear-gradient(180deg,color-mix(in srgb,var(--car-color,#e34245),white 16%),var(--car-color,#e34245) 58%,color-mix(in srgb,var(--car-color,#e34245),black 24%));clip-path:polygon(18% 62%,27% 24%,43% 10%,69% 14%,84% 45%,94% 57%,92% 78%,77% 85%,20% 85%,7% 73%,8% 60%);filter:drop-shadow(0 8px 2px #0007)}
.turbo-setup__car-preview::after{content:"";position:absolute;left:24%;right:24%;bottom:12%;height:14%;border-left:13px solid #090a0c;border-right:13px solid #090a0c;border-radius:8px;filter:drop-shadow(0 3px 0 #000)}
.turbo-setup__stats{margin:8px 0 0;padding-top:8px;border-top:1px solid #ffffff19;color:#f0c85f;font:900 9px/1.5 system-ui;letter-spacing:.04em;white-space:pre-line}
.turbo-setup__footer{display:flex;align-items:stretch;gap:10px;padding:0 10px 10px}
.turbo-setup__info{display:grid;gap:3px;min-width:0;flex:1;padding:10px 12px;border:1px solid #ffffff1f;background:#05080ca8}
.turbo-setup__mode{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f6f0e2;font:900 11px/1.2 system-ui;letter-spacing:.05em}
.turbo-setup__ready{color:#77e2ff;font:900 10px/1.2 system-ui;letter-spacing:.04em}
.turbo-setup__roster{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8e9aa7;font:800 9px/1.25 system-ui}
.turbo-setup__cta{display:grid;place-items:center;min-width:160px;padding:10px 16px;border:2px solid #f0c85f;background:#f0c85f;color:#16130a;box-shadow:4px 4px 0 #0007;font:1000 12px/1 system-ui;letter-spacing:.08em;text-align:center}
.turbo-setup__cta[data-ready="true"]{border-color:#74e49a;background:#74e49a;color:#07120b}
.turbo-setup__help{margin:0;padding:0 12px 13px;color:#aab3bc;font:800 9px/1.45 system-ui;letter-spacing:.04em;text-align:center}

@container turbo (max-width:620px) {
  .turbo-setup__header{padding:8px 10px}
  .turbo-setup__header h2{font-size:22px}
  .turbo-setup__grid{gap:6px;padding:6px}
  .turbo-setup__card{padding:8px}
  .turbo-setup__map,.turbo-setup__car-preview{height:72px}
  .turbo-setup__meta{min-height:0}
  .turbo-setup__footer{gap:6px;padding:0 6px 6px}
  .turbo-setup__info{padding:6px}
  .turbo-setup__cta{min-width:100px;font-size:10px;padding:6px}
  .turbo-setup__mode{white-space:normal;font-size:10px}
  .turbo-setup__help{padding:0 8px 8px;letter-spacing:0}
}
@container turbo (max-height:350px) {
  .turbo-setup{padding:4px}
  .turbo-setup__header{padding:6px 8px}
  .turbo-setup__header h2{font-size:18px}
  .turbo-setup__eyebrow,.turbo-setup__version,.turbo-setup__car-preview,
  .turbo-setup__stats,.turbo-setup__roster,.turbo-setup__help{display:none}
  .turbo-setup__map{height:42px;margin-top:4px}
  .turbo-setup__name{font-size:16px}
  .turbo-setup__kicker{margin-bottom:5px}
  .turbo-setup__meta{font-size:10px;line-height:1.3;margin-top:4px}
  .turbo-setup__grid{padding:5px;gap:5px}
  .turbo-setup__card{padding:6px}
  .turbo-setup__footer{padding:0 5px 5px}
  .turbo-setup__help{font-size:10px;line-height:1.3}
}
@container turbo (max-height:250px) {
  .turbo-setup__map{display:none}
}
@container turbo (max-width:360px) and (min-height:351px) {
  .turbo-setup__grid{grid-template-columns:1fr}
  .turbo-setup__map,.turbo-setup__car-preview{height:54px}
}
`;
