import { describe, expect, it } from "vitest";
import { roomAdmissionFailure, roomAdmissionMessages } from "../convex/_shared/roomAdmission";

describe("room admission business failures", () => {
  it.each(Object.entries(roomAdmissionMessages))(
    "returns a serializable safe result for %s",
    (code, message) => {
      expect(roomAdmissionFailure(code as keyof typeof roomAdmissionMessages)).toEqual({
        ok: false,
        error: code,
        message,
      });
    },
  );
});
