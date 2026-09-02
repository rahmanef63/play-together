export function enableMinimapToggle(minimap: HTMLElement) {
  minimap.tabIndex = 0;
  minimap.setAttribute("role", "button");
  minimap.setAttribute("aria-label", "Toggle race map size");
  minimap.dataset.expanded = "false";
  const style = document.createElement("style");
  style.textContent = `.turbo-minimap{pointer-events:auto;cursor:pointer;transition:opacity .18s,width .18s,background .18s}.turbo-minimap[data-expanded="true"]{width:clamp(190px,42vw,310px);background:#080b10ed;box-shadow:0 8px 28px #0009}`;
  minimap.append(style);
  const toggle = () => {
    minimap.dataset.expanded = minimap.dataset.expanded === "true" ? "false" : "true";
  };
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  };
  minimap.addEventListener("click", toggle);
  minimap.addEventListener("keydown", key);
  return () => {
    minimap.removeEventListener("click", toggle);
    minimap.removeEventListener("keydown", key);
  };
}
