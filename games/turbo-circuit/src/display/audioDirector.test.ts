import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioDirector } from "./audioDirector.js";

let close: ReturnType<typeof vi.fn>;
beforeEach(() => {
  close = vi.fn(async () => undefined);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "suspended";
      resume = () => new Promise<void>(() => undefined);
      close = close;
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const button = Object.assign(new EventTarget(), {
    textContent: "",
    dataset: {},
  }) as unknown as HTMLButtonElement;
  return { button, director: new AudioDirector(button) };
}
describe("race sound preference", () => {
  it("updates the toggle even when browser audio activation has not resolved", async () => {
    const { button, director } = fixture();
    button.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(button.textContent).toBe("SOUND OFF");
    button.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(button.textContent).toBe("SOUND ON");
    expect(button.dataset.enabled).toBe("true");
    director.dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("keeps later mute input responsive while activation is pending", async () => {
    const { button, director } = fixture();
    for (let index = 0; index < 3; index++) button.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(button.textContent).toBe("SOUND OFF");
    expect(button.dataset.enabled).toBe("false");
    director.dispose();
  });
});
