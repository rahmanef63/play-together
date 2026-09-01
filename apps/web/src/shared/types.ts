import type {
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
  presentation: {
    remoteDisplay: { mode: "shared" | "per-player"; maxViewports: number };
  };
  visibility: "public" | "private";
  requiresPassword: boolean;
  maxPlayers: number;
  status: "open" | "closed";
  playState: "lobby" | "playing";
  sessionStartedAt?: number;
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
