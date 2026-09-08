import { describe, expect, it } from "vitest";
import { gameInviteUrl, parseRoomCode, roomInviteUrl } from "./inviteLinks";

describe("invitation links", () => {
  it("keeps room choice and remote pairing intent distinct without inheriting secrets", () => {
    expect(roomInviteUrl("https://example.test/?password=private", "ABC123")).toBe(
      "https://example.test/room/ABC123",
    );
    expect(roomInviteUrl("https://example.test", "ABC123", true)).toBe(
      "https://example.test/room/ABC123?join=remote",
    );
  });
  it("shares an encoded game identity without pinning a stale release", () => {
    expect(gameInviteUrl("https://example.test/room/OLD", "new-game")).toBe(
      "https://example.test/?game=new-game",
    );
  });
});

it("accepts a same-site invitation or formatted room code and rejects unrelated links", () => {
  expect(parseRoomCode(" abC–123 ", "https://game.test")).toBe("ABC123");
  expect(parseRoomCode("https://game.test/room/ABC123?join=remote", "https://game.test")).toBe(
    "ABC123",
  );
  expect(parseRoomCode("https://other.test/room/ABC123", "https://game.test")).toBeNull();
  expect(parseRoomCode("https://game.test/?room=ABC123", "https://game.test")).toBeNull();
});
