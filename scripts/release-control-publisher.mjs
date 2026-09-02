import {
  BLOCKED_RELEASES_KEY,
  encodeReleaseIdentity,
  RELEASE_CONTROL_CHANNEL,
  releaseControlEventSchema,
} from "@play-together/contracts";
import { createClient } from "redis";

const RELEASE_CONTROL_SCRIPT = `
local changed
if ARGV[2] == "blocked" then
  changed = redis.call("SADD", KEYS[1], ARGV[1])
else
  changed = redis.call("SREM", KEYS[1], ARGV[1])
end
if changed == 1 then
  redis.call("PUBLISH", KEYS[2], ARGV[3])
end
return changed
`;

export class ReleaseControlPublisher {
  readonlyClient;

  constructor(client) {
    this.readonlyClient = client;
  }

  static async connect(url) {
    const client = createClient({
      url,
      socket: { reconnectStrategy: (retries) => Math.min(200 * (retries + 1), 5_000) },
    });
    client.on("error", (error) => {
      console.warn(
        JSON.stringify({
          event: "redis_connection_error",
          code: error instanceof Error && "code" in error ? String(error.code) : "REDIS_ERROR",
        }),
      );
    });
    await client.connect();
    return new ReleaseControlPublisher(client);
  }

  async apply(release) {
    const identity = {
      gameId: release.gameId,
      version: release.version,
      manifestSha256: release.manifestSha256,
    };
    const member = encodeReleaseIdentity(identity);
    const status = release.status ?? "active";
    const event = releaseControlEventSchema.parse({
      type: "release-status",
      ...identity,
      status,
      changedAt: Date.now(),
    });
    const changed = await this.readonlyClient.eval(RELEASE_CONTROL_SCRIPT, {
      keys: [BLOCKED_RELEASES_KEY, RELEASE_CONTROL_CHANNEL],
      arguments: [member, status, JSON.stringify(event)],
    });
    return Number(changed) === 1;
  }

  async close() {
    if (!this.readonlyClient.isOpen) return;
    await this.readonlyClient.quit().catch(() => this.readonlyClient.destroy());
  }
}
