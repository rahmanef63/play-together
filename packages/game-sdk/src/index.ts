import type { ControllerMode, SnapshotMessage } from "@play-together/contracts";

export interface ServerPlayer {
  id: string;
  connectedAt: number;
}

export interface ServerGameContext {
  roomId: string;
  gameId: string;
  gameVersion: string;
  seed: number;
}

export interface ServerGame {
  onJoin(player: ServerPlayer): void | Promise<void>;
  onLeave(playerId: string): void | Promise<void>;
  onInput(playerId: string, payload: unknown, sequence: number): void | Promise<void>;
  tick(nowMs: number, deltaMs: number): void | Promise<void>;
  snapshot(): unknown;
  dispose?(): void | Promise<void>;
}

export type CreateServerGame = (context: ServerGameContext) => ServerGame | Promise<ServerGame>;

export interface BrowserGameContext {
  playerId: string;
  mode: ControllerMode;
  sendInput(payload: unknown): void;
  subscribe(listener: (snapshot: SnapshotMessage) => void): () => void;
  getLatestSnapshot(): SnapshotMessage | null;
  loadAsset(name: string): Promise<Blob>;
  setStatus(message: string): void;
}

export interface DisplayGameModule {
  mountDisplay(root: HTMLElement, context: BrowserGameContext): undefined | (() => void);
}

export interface ControllerGameModule {
  mountController(root: HTMLElement, context: BrowserGameContext): undefined | (() => void);
}
