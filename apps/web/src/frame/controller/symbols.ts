export type CanonicalFaceSymbol = "cross" | "circle" | "square" | "triangle";

const FACE_SYMBOLS: Readonly<Record<string, CanonicalFaceSymbol>> = {
  a: "cross",
  b: "circle",
  c: "square",
  x: "square",
  d: "triangle",
  y: "triangle",
};

/**
 * Visible face glyphs are universal physical symbols while logical A/B/X/Y
 * semantics stay stable for manifests, keyboard mappings and W3C gamepads.
 */
export function canonicalFaceSymbol(face: string | undefined): CanonicalFaceSymbol | null {
  return face ? (FACE_SYMBOLS[face] ?? null) : null;
}
