import type { GameMode } from "./common.js";

export interface PublicGameSummary {
  gameId: string;
  version: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  modes: GameMode[];
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation: "portrait" | "landscape" | "adaptive";
  manifestUrl: string;
  manifestSha256: string;
}

export interface PublicRoomSummary {
  code: string;
  name: string;
  gameId: string;
  gameVersion: string;
  gameTitle: string;
  hostName: string;
  maxPlayers: number;
  activePlayers: number;
  availableSpots: number;
  requiresPassword: boolean;
  createdAt: number;
}

export interface HostedRoomSummary extends PublicRoomSummary {
  visibility: "public" | "private";
  status: "open" | "closed";
  updatedAt: number;
}
