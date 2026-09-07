import type { ConsoleControl } from "@play-together/contracts";
export function keyboardLegend(control: ConsoleControl): string {
  if (!("keys" in control) || !control.keys) return "";
  const keys = Array.isArray(control.keys) ? control.keys : Object.values(control.keys).flat();
  return [...new Set(keys.filter((key): key is string => typeof key === "string"))]
    .map((key) =>
      key
        .replace(/^Key/, "")
        .replace(/^Digit/, "")
        .replace(/^Arrow/, "")
        .replace(/^(Shift|Control|Alt)(Left|Right)$/, "$1")
        .replace("Space", "Spacebar"),
    )
    .filter((key, i, all) => all.indexOf(key) === i)
    .join(" / ");
}
