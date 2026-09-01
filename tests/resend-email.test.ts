import { describe, expect, it, vi } from "vitest";
import { buildPasswordResetEmail, sendPasswordResetEmail } from "../convex/_shared/resendEmail";

const input = {
  identifier: "Player@Example.com",
  token: "12345678",
  expires: new Date(Date.now() + 10 * 60_000),
};

describe("password reset email", () => {
  it("uses the shared official sender and dynamic project identity", () => {
    const message = buildPasswordResetEmail(input, {
      EMAIL_FROM_ADDRESS: "official@rahmanef.com",
      EMAIL_PROJECT_NAME: "Arcade Beta",
      EMAIL_PROJECT_TAG: "Arcade Beta / 2026",
      EMAIL_SITE_URL: "https://arcade.example.com",
    });
    expect(message.from).toBe("Arcade Beta <official@rahmanef.com>");
    expect(message.to).toEqual(["player@example.com"]);
    expect(message.subject).toContain("Arcade Beta");
    expect(message.tags).toContainEqual({ name: "project", value: "arcade-beta-2026" });
    expect(message.tags).toContainEqual({ name: "purpose", value: "password-reset" });
    expect(message.text).toContain("12345678");
    expect(message.html).toContain("12345678");
    expect(message.html).toContain(">PT<");
    expect(message.html).toContain("Arcade Beta");
    expect(message.html).toContain("arcade.example.com");
    expect(message.text).toContain("arcade.example.com");
    expect(message.html).toContain("If you did not request this password reset");
  });

  it("sends through Resend without placing the API key in the payload", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).not.toContain("dummy-resend-key-for-unit-test");
      expect(init?.headers).toMatchObject({
        authorization: "Bearer dummy-resend-key-for-unit-test",
        "content-type": "application/json",
      });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    });
    await sendPasswordResetEmail(
      input,
      {
        RESEND_API_KEY: "dummy-resend-key-for-unit-test",
        EMAIL_FROM_ADDRESS: "official@rahmanef.com",
        EMAIL_PROJECT_NAME: "Play Together",
        EMAIL_PROJECT_TAG: "play-together",
      },
      fetchImpl as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
