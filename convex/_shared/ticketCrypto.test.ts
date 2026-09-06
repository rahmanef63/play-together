import type { TemplateDownloadClaims, TicketClaims } from "@play-together/contracts";
import {
  signTicket as signTicketNode,
  verifyTemplateDownloadTicket as verifyTemplateDownloadTicketNode,
  verifyTicket as verifyTicketNode,
} from "@play-together/security";
import { describe, expect, it } from "vitest";
import { signTemplateDownloadTicket, verifyTemplateDownloadTicket } from "./templateDownloadTicket";
import { signTicket, verifyTicket } from "./ticketCrypto";

const secret = "s".repeat(48);
const now = Math.floor(Date.now() / 1000);
const ticketClaims: TicketClaims = {
  iss: "play-together",
  aud: "play-together-realtime",
  sub: "user-1",
  roomId: "room-1",
  roomCode: "ABCD",
  role: "controller",
  mode: "remote",
  gameId: "clash-arena",
  gameVersion: "0.4.0",
  manifestUrl: "https://game.rahmanef.com/games/clash-arena/0.4.0/manifest.json",
  manifestSha256: "a".repeat(64),
  iat: now,
  exp: now + 600,
  jti: "ticket-jti-1",
};
const templateClaims: TemplateDownloadClaims = {
  iss: "play-together",
  aud: "play-together-template-download",
  sub: "user-1",
  templateId: "template-1",
  slug: "starter-pack",
  blobPath: "templates/starter-pack.tar.gz",
  fileName: "starter-pack.tar.gz",
  iat: now,
  exp: now + 120,
  jti: "template-jti-1",
};

describe("Convex HMAC ticket verification", () => {
  it("verifies realtime tickets produced by either runtime", async () => {
    const convexToken = await signTicket(ticketClaims, secret);
    expect(verifyTicketNode(convexToken, secret)).toEqual(ticketClaims);
    const nodeToken = signTicketNode(ticketClaims, secret);
    await expect(verifyTicket(nodeToken, secret)).resolves.toEqual(ticketClaims);
  });

  it("verifies template tickets produced by either runtime", async () => {
    const convexToken = await signTemplateDownloadTicket(templateClaims, secret);
    expect(verifyTemplateDownloadTicketNode(convexToken, secret)).toEqual(templateClaims);
    await expect(verifyTemplateDownloadTicket(convexToken, secret)).resolves.toEqual(
      templateClaims,
    );
  });

  it("rejects wrong signatures", async () => {
    const token = signTicketNode(ticketClaims, secret);
    await expect(verifyTicket(token, "x".repeat(48))).rejects.toThrow(/signature/i);
  });
});
