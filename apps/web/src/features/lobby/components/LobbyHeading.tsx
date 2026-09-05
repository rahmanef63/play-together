import type { CurrentUser, GameSummary } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";

export function LobbyHeading({
  user,
  game,
  code,
  password,
  busy,
  onCodeChange,
  onPasswordChange,
  onJoin,
}: {
  user: CurrentUser;
  game: GameSummary | undefined;
  code: string;
  password: string;
  busy: boolean;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onJoin: () => void;
}) {
  return (
    <section className="page-heading">
      <div className="console-hero-copy">
        <p className="eyebrow">WELCOME, {user.name.toUpperCase()}</p>
        <h1>{game ? game.title : "Find a spot to play together."}</h1>
        {game && <p className="console-hero-meta">SELECTED GAME · v{game.version}</p>}
      </div>
      {game && (
        <img
          className="console-hero-art"
          src={`/game-previews/${game.gameId}.png`}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className="join-inline">
        <input
          aria-label="Room code"
          placeholder="ROOM CODE"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          maxLength={8}
        />
        <input
          aria-label="Room password"
          placeholder="Password (optional)"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <Button type="button" onClick={onJoin} busy={busy}>
          Join
        </Button>
      </div>
    </section>
  );
}
