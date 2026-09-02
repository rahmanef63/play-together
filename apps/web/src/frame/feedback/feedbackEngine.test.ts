import { afterEach, describe, expect, it, vi } from "vitest";
import { GameFeedbackEngine } from "./feedbackEngine";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");
});

function installNavigator(hasBeenActive: boolean) {
  const vibrate = vi.fn();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { vibrate, userActivation: { hasBeenActive } },
  });
  return vibrate;
}

describe("game feedback haptics", () => {
  it("does not vibrate before the controller frame receives real user activation", () => {
    const vibrate = installNavigator(false);
    const feedback = new GameFeedbackEngine();

    feedback.cue("impact");
    feedback.unlock();
    feedback.cue("success");
    feedback.stop();

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("vibrates only after unlock and browser user activation", () => {
    const vibrate = installNavigator(true);
    const feedback = new GameFeedbackEngine();

    feedback.cue("impact");
    expect(vibrate).not.toHaveBeenCalled();

    feedback.unlock();
    feedback.cue("control");
    expect(vibrate).toHaveBeenCalledWith(8);

    feedback.stop();
    expect(vibrate).toHaveBeenLastCalledWith(0);
  });
});
