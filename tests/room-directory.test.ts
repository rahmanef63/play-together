/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

async function fixture() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Room host" }));
  const owner = t.withIdentity({ subject: `${userId}|room-session` });
  await t.run(async (ctx) => {
    for (let index = 0; index < 105; index += 1) {
      await ctx.db.insert("rooms", {
        code: `ROOM${String(index).padStart(3, "0")}`,
        name: `Room ${index}`,
        hostUserId: userId,
        hostName: "Room host",
        gameId: "fixture-game",
        gameVersion: "1.0.0",
        gameTitle: "Fixture Game",
        manifestUrl: "https://games.test/fixture/1.0.0/manifest.json",
        manifestSha256: "a".repeat(64),
        visibility: "public",
        maxPlayers: 4,
        status: "open",
        createdAt: index,
        updatedAt: index,
      });
    }
  });
  return { t, owner };
}

describe("bounded room directories", () => {
  it.each([
    ["public", api.rooms.listPublic],
    ["hosted", api.rooms.listMine],
  ] as const)(
    "includes newly created rooms in the %s directory after 100 rooms",
    async (_name, query) => {
      const { owner } = await fixture();
      const rooms = await owner.query(query, {});
      expect(rooms).toHaveLength(100);
      expect(rooms[0]?.code).toBe("ROOM104");
      expect(rooms.at(-1)?.code).toBe("ROOM005");
      expect(rooms.some((room) => room.code === "ROOM000")).toBe(false);
    },
  );

  it("keeps room listings authenticated", async () => {
    const { t } = await fixture();
    await expect(t.query(api.rooms.listPublic, {})).rejects.toThrow("Sign in first");
    await expect(t.query(api.rooms.listMine, {})).rejects.toThrow("Sign in first");
  });
});
