import type { ReleaseControlEvent, ReleaseIdentity } from "@play-together/contracts";

export type ReleaseControlListener = (event: ReleaseControlEvent) => void;

export interface ReleaseControl {
  start(listener: ReleaseControlListener): Promise<void>;
  close(): Promise<void>;
}

export class ReleaseBlockedError extends Error {
  readonly code = "RELEASE_BLOCKED";

  constructor(identity: ReleaseIdentity) {
    super(`Game release ${identity.gameId}@${identity.version} is blocked`);
    this.name = "ReleaseBlockedError";
  }
}
