import { gameManifestSchema } from "@play-together/contracts";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { selectLatestPublishedByGame, toPublicGameSummary } from "./_shared/gameCatalog";
import { normalizeRemoteDisplay } from "./_shared/gamePresentation";
import { requireQueryUser } from "./_shared/guards";

const publicationArgs = {
  manifestUrl: v.string(),
  manifestSha256: v.string(),
  publishToken: v.string(),
  remoteDisplayMode: v.optional(v.union(v.literal("shared"), v.literal("per-player"))),
  maxViewports: v.optional(v.number()),
};

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    await requireQueryUser(ctx);
    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(200);
    return games.map(toPublicGameSummary).sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const listLatestPublished = query({
  args: {},
  handler: async (ctx) => {
    await requireQueryUser(ctx);
    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(200);
    return selectLatestPublishedByGame(games)
      .map(toPublicGameSummary)
      .sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const getPublishedInternal = internalQuery({
  args: { gameId: v.string(), version: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_game_version", (q) => q.eq("gameId", args.gameId).eq("version", args.version))
      .unique();
    return game?.status === "published" ? game : null;
  },
});

export const publish = action({
  args: publicationArgs,
  handler: async (ctx, args): Promise<Id<"games">> => {
    const expectedToken = process.env.GAME_PUBLISH_TOKEN;
    if (!expectedToken || args.publishToken !== expectedToken) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid game publication token" });
    }
    const url = new URL(args.manifestUrl);
    const allowedOrigins = new Set(
      (process.env.GAME_MODULE_ORIGINS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    if (!allowedOrigins.has(url.origin))
      throw new ConvexError({ code: "ORIGIN_DENIED", message: "Game origin is not allowlisted" });
    if (url.protocol !== "https:" && process.env.ALLOW_INSECURE_GAME_ORIGINS !== "true") {
      throw new ConvexError({
        code: "HTTPS_REQUIRED",
        message: "Published game manifests require HTTPS",
      });
    }
    const fetchUrl = mapFetchUrl(args.manifestUrl, process.env.GAME_MODULE_FETCH_ORIGIN_MAP);
    const response = await fetch(fetchUrl, { redirect: "error" });
    if (!response.ok)
      throw new ConvexError({
        code: "MANIFEST_FETCH_FAILED",
        message: `Manifest returned ${response.status}`,
      });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 1_000_000)
      throw new ConvexError({ code: "MANIFEST_TOO_LARGE", message: "Manifest exceeds 1 MB" });
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (digest !== args.manifestSha256.toLowerCase()) {
      throw new ConvexError({
        code: "INTEGRITY_FAILED",
        message: "Manifest digest does not match",
      });
    }
    const manifest = gameManifestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    const presentation = normalizeRemoteDisplay(args.remoteDisplayMode, args.maxViewports);
    return await ctx.runMutation(internal.games.upsertPublishedInternal, {
      gameId: manifest.game.id,
      version: manifest.game.version,
      title: manifest.game.title,
      description: manifest.game.description,
      manifestUrl: args.manifestUrl,
      manifestSha256: digest,
      minPlayers: manifest.game.minPlayers,
      maxPlayers: manifest.game.maxPlayers,
      modes: manifest.modes,
      supportsRemote: manifest.controller.supportsRemote,
      supportsHandheld: manifest.controller.supportsHandheld,
      preferredOrientation: manifest.controller.preferredOrientation,
      remoteDisplayMode: presentation.mode,
      maxViewports: presentation.maxViewports,
    });
  },
});

export const upsertPublishedInternal = internalMutation({
  args: {
    gameId: v.string(),
    version: v.string(),
    title: v.string(),
    description: v.string(),
    manifestUrl: v.string(),
    manifestSha256: v.string(),
    minPlayers: v.number(),
    maxPlayers: v.number(),
    modes: v.array(v.union(v.literal("shared-screen"), v.literal("handheld"))),
    supportsRemote: v.boolean(),
    supportsHandheld: v.boolean(),
    preferredOrientation: v.union(
      v.literal("portrait"),
      v.literal("landscape"),
      v.literal("adaptive"),
    ),
    remoteDisplayMode: v.union(v.literal("shared"), v.literal("per-player")),
    maxViewports: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_game_version", (q) => q.eq("gameId", args.gameId).eq("version", args.version))
      .unique();
    if (existing && existing.manifestSha256 !== args.manifestSha256) {
      throw new ConvexError({
        code: "IMMUTABLE_VERSION",
        message: "A published game version cannot be replaced; publish a new version",
      });
    }
    const record = {
      ...args,
      status: "published" as const,
      publishedAt: existing?.publishedAt ?? Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }
    return ctx.db.insert("games", record);
  },
});

function mapFetchUrl(publicUrl: string, encodedMap: string | undefined): string {
  if (!encodedMap) return publicUrl;
  const parsed = JSON.parse(encodedMap) as Record<string, unknown>;
  const publicAddress = new URL(publicUrl);
  const replacement = parsed[publicAddress.origin];
  if (typeof replacement !== "string") return publicUrl;
  const internalAddress = new URL(replacement);
  internalAddress.pathname = publicAddress.pathname;
  internalAddress.search = publicAddress.search;
  return internalAddress.toString();
}
