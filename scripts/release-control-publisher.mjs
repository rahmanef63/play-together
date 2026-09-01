import {
  BLOCKED_RELEASES_KEY,
  encodeReleaseIdentity,
  RELEASE_CONTROL_CHANNEL,
  releaseControlEventSchema,
} from "@play-together/contracts";
import Redis from "ioredis";

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
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (attempt) => Math.min(200 * attempt, 5_000),
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
    const changed = await this.readonlyClient.eval(
      RELEASE_CONTROL_SCRIPT,
      2,
      BLOCKED_RELEASES_KEY,
      RELEASE_CONTROL_CHANNEL,
      member,
      status,
      JSON.stringify(event),
    );
    return Number(changed) === 1;
  }

  async close() {
    if (this.readonlyClient.status === "wait" || this.readonlyClient.status === "end") return;
    await this.readonlyClient.quit().catch(() => this.readonlyClient.disconnect());
  }
}
