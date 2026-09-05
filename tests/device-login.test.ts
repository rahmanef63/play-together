/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import {
  deviceDigest,
  normalizeDeviceCode,
  sameDeviceProof,
} from "../convex/_shared/deviceLoginPolicy";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const proof = "ab".repeat(32),
  clientId = "cd".repeat(16);

async function fixture() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Fixture owner" }));
  const owner = t.withIdentity({ subject: `${userId}|fixture-session` });
  const proofHash = await deviceDigest(proof);
  const request = await t.action(api.deviceLogin.start, {
    proofHash,
    clientId,
    label: "Living room TV",
  });
  return { t, owner, request, userId, proofHash };
}

describe("device sign-in authorization", () => {
  it("stores only digests and never puts the private proof in a public code", async () => {
    const { t, request, proofHash } = await fixture();
    expect(request.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(Object.keys(request).sort()).toEqual(["code", "expiresAt", "id", "intervalMs"]);
    const saved = await t.run((ctx) => ctx.db.get(request.id));
    expect(saved).toMatchObject({
      proofHash,
      codeHash: await deviceDigest(request.code),
      state: "pending",
    });
    expect(JSON.stringify(saved)).not.toContain(proof);
    expect(saved).not.toHaveProperty("code");
  });
  it("requires authentication for inspection and approval", async () => {
    const { t, request } = await fixture();
    await expect(t.action(api.deviceLogin.inspect, { code: request.code })).rejects.toThrow();
    await expect(
      t.action(api.deviceLogin.decide, { code: request.code, approve: true }),
    ).rejects.toThrow();
    expect(await t.action(api.deviceLogin.status, { id: request.id, proof })).toEqual({
      state: "pending",
    });
  });
  it("inspection does not approve or reveal the requester secret", async () => {
    const { owner, t, request } = await fixture();
    const detail = await owner.action(api.deviceLogin.inspect, { code: request.code });
    expect(detail).toMatchObject({ label: "Living room TV", expiresAt: request.expiresAt });
    expect(Object.keys(detail ?? {}).sort()).toEqual(["createdAt", "expiresAt", "label"]);
    expect((await t.run((ctx) => ctx.db.get(request.id)))?.state).toBe("pending");
  });
  it("refuses claiming a pending request even with the correct proof", async () => {
    const { t, request, proofHash } = await fixture();
    await expect(
      t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
    ).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(request.id)))?.state).toBe("pending");
  });
  it("requires original-device proof after explicit approval and consumes once", async () => {
    const { t, owner, request, proofHash, userId } = await fixture();
    await owner.action(api.deviceLogin.decide, { code: request.code, approve: true });
    await expect(
      t.mutation(internal.deviceLoginInternals.consume, {
        id: request.id,
        proofHash: "00".repeat(32),
      }),
    ).rejects.toThrow();
    expect(
      await t.action(api.deviceLogin.status, { id: request.id, proof: "00".repeat(32) }),
    ).toEqual({ state: "expired" });
    expect(
      await t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
    ).toBe(userId);
    await expect(
      t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
    ).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(request.id)))?.state).toBe("consumed");
  });
  it("allows at most one concurrent claim of the approved request", async () => {
    const { t, owner, request, proofHash } = await fixture();
    await owner.action(api.deviceLogin.decide, { code: request.code, approve: true });
    const attempts = await Promise.allSettled(
      [1, 2].map(() =>
        t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
  });
  it("does not allow a second account to overwrite approval", async () => {
    const { t, owner, request, userId } = await fixture();
    const otherId = await t.run((ctx) => ctx.db.insert("users", { name: "Other fixture" }));
    await owner.action(api.deviceLogin.decide, { code: request.code, approve: true });
    await expect(
      t
        .withIdentity({ subject: `${otherId}|session` })
        .action(api.deviceLogin.decide, { code: request.code, approve: true }),
    ).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(request.id)))?.approvedBy).toBe(userId);
  });
  it.each(["pending", "approved"] as const)(
    "expires %s requests before further approval or claim",
    async (state) => {
      const { t, owner, request, proofHash, userId } = await fixture();
      await t.run((ctx) =>
        ctx.db.patch(request.id, { expiresAt: Date.now() - 1, state, approvedBy: userId }),
      );
      expect(await owner.action(api.deviceLogin.inspect, { code: request.code })).toBeNull();
      await expect(
        owner.action(api.deviceLogin.decide, { code: request.code, approve: true }),
      ).rejects.toThrow();
      await expect(
        t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
      ).rejects.toThrow();
    },
  );
  it("decline and original-device cancellation cannot be exchanged", async () => {
    const { t, owner, request, proofHash } = await fixture();
    await owner.action(api.deviceLogin.decide, { code: request.code, approve: false });
    await expect(
      t.mutation(internal.deviceLoginInternals.consume, { id: request.id, proofHash }),
    ).rejects.toThrow();
    const another = await t.action(api.deviceLogin.start, {
      clientId,
      proofHash,
      label: "Other screen",
    });
    await t.action(api.deviceLogin.cancel, { id: another.id, proof });
    await expect(
      owner.action(api.deviceLogin.decide, { code: another.code, approve: true }),
    ).rejects.toThrow();
  });
  it("cannot cancel another device with the wrong proof", async () => {
    const { t, request } = await fixture();
    await t.action(api.deviceLogin.cancel, { id: request.id, proof: "11".repeat(32) });
    expect((await t.run((ctx) => ctx.db.get(request.id)))?.state).toBe("pending");
  });
  it("enforces allocation and polling limits", async () => {
    const { t, request, proofHash } = await fixture();
    expect((await t.action(api.deviceLogin.status, { id: request.id, proof })).state).toBe(
      "pending",
    );
    expect((await t.action(api.deviceLogin.status, { id: request.id, proof })).state).toBe(
      "slow_down",
    );
    for (let i = 0; i < 5; i++)
      await t.action(api.deviceLogin.start, { clientId, proofHash, label: "Rate limit fixture" });
    await expect(
      t.action(api.deviceLogin.start, { clientId, proofHash, label: "Rejected allocation" }),
    ).rejects.toThrow();
  });
  it("cleans expired records without removing a live challenge", async () => {
    const { t, request, proofHash } = await fixture();
    const active = await t.action(api.deviceLogin.start, {
      clientId,
      proofHash,
      label: "Active screen",
    });
    await t.run((ctx) => ctx.db.patch(request.id, { expiresAt: Date.now() - 1 }));
    expect(await t.mutation(internal.deviceLoginInternals.cleanup)).toBe(1);
    expect(await t.run((ctx) => ctx.db.get(request.id))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(active.id))).not.toBeNull();
  });
  it("rejects missing, malformed and ambiguous codes or proofs", () => {
    expect(normalizeDeviceCode("abcd-2345")).toBe("ABCD2345");
    for (const code of ["", "12345678", "ABCDEFGI", "<script>"])
      expect(() => normalizeDeviceCode(code)).toThrow();
    expect(sameDeviceProof(proof, proof)).toBe(true);
    expect(sameDeviceProof(proof, "ab")).toBe(false);
    expect(sameDeviceProof(proof, "11".repeat(32))).toBe(false);
  });
});
