import type { ControllerMode } from "@play-together/contracts";
import type { TicketResponse } from "../../../shared/types";
import type { RemoteRole } from "../remotePresentation";

const FRAME_READY_TIMEOUT_MS = 12_000;
const RECOVERY_NAV_TIMEOUT_MS = 4_000;

type BootstrapTicket = Pick<
  TicketResponse,
  "playerId" | "gameId" | "gameVersion" | "manifestUrl" | "manifestSha256"
>;

interface FrameTarget {
  contentWindow: { postMessage: (message: unknown, targetOrigin: string) => void } | null;
  src: string;
  addEventListener(type: "load", listener: () => void): void;
  removeEventListener(type: "load", listener: () => void): void;
}

export function mountFrameBootstrap(options: {
  frame: FrameTarget;
  channel: string;
  role: RemoteRole;
  mode: ControllerMode;
  ticket: BootstrapTicket;
  onLoad: () => void;
  onStall: (message: string) => void;
}) {
  const frameUrl = options.frame.src;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ready = false;
  let forcedReloads = 0;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  const forceReload = () => {
    if (ready) return;
    if (forcedReloads >= 1) {
      options.onStall("Game renderer did not become ready after recovery");
      return;
    }
    forcedReloads += 1;
    options.frame.src = frameUrl;
  };
  const arm = (delay: number) => {
    clearTimer();
    timer = setTimeout(forceReload, delay);
  };
  const onLoad = () => {
    ready = false;
    options.frame.contentWindow?.postMessage(
      {
        type: "init",
        channel: options.channel,
        role: options.role,
        mode: options.mode,
        playerId: options.ticket.playerId,
        gameId: options.ticket.gameId,
        gameVersion: options.ticket.gameVersion,
        manifestUrl: options.ticket.manifestUrl,
        manifestSha256: options.ticket.manifestSha256,
      },
      "*",
    );
    options.onLoad();
    arm(FRAME_READY_TIMEOUT_MS);
  };
  options.frame.addEventListener("load", onLoad);

  return {
    ready() {
      ready = true;
      forcedReloads = 0;
      clearTimer();
    },
    recovering() {
      ready = false;
      arm(RECOVERY_NAV_TIMEOUT_MS);
    },
    dispose() {
      clearTimer();
      options.frame.removeEventListener("load", onLoad);
    },
  };
}
