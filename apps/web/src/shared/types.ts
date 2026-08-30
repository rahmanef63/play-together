import type {
  BuiltinConsoleConfig,
  GameMode,
  HostedRoomSummary,
  PublicGameSummary,
  PublicRoomSummary,
} from "@play-together/contracts";

export type GameSummary = PublicGameSummary;
export type RoomSummary = PublicRoomSummary;
export type MyRoomSummary = HostedRoomSummary;

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
}

export interface RoomDetails {
  code: string;
  name: string;
  hostUserId: string;
  hostName: string;
  gameId: string;
  gameVersion: string;
  gameTitle: string;
  gameModes: GameMode[];
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation: "portrait" | "landscape" | "adaptive";
  visibility: "public" | "private";
  requiresPassword: boolean;
  maxPlayers: number;
  status: "open" | "closed";
  activeMembers: Array<{ userId: string; displayName: string }>;
}

export interface TicketResponse {
  ticket: string;
  expiresAt: number;
  playerId: string;
  manifestUrl: string;
  manifestSha256: string;
  gameId: string;
  gameVersion: string;
}

export type { GameMode };

export interface GameRegistryEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  previewUrl: string;
  controller: {
    supportsRemote: boolean;
    supportsHandheld: boolean;
    preferredOrientation: "portrait" | "landscape" | "adaptive";
    console?: BuiltinConsoleConfig;
  };
}

export interface GameRegistryDocument {
  schemaVersion: 1;
  games: GameRegistryEntry[];
}
