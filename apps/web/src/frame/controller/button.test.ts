import { describe, expect, it } from "vitest";
import { semanticButtonLabel } from "./button";

describe("semantic console button labels", () => {
  it("derives a readable action label from manifest semantics without a game map", () => {
    expect(semanticButtonLabel({ label: "A", ariaLabel: "Reaction button" } as never)).toBe(
      "REACTION",
    );
    expect(semanticButtonLabel({ label: "Y", ariaLabel: "Yellow memory pad" } as never)).toBe(
      "YELLOW MEMORY",
    );
    expect(semanticButtonLabel({ label: "A", ariaLabel: "Fire cannon" } as never)).toBe(
      "FIRE CANNON",
    );
  });

  it("keeps already-semantic labels unchanged", () => {
    expect(semanticButtonLabel({ label: "BRAKE", ariaLabel: "Brake" } as never)).toBe("BRAKE");
  });
});
