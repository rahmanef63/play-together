import type { CurrentUser } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";

export function LobbyHeading({
  user,
  code,
  password,
  busy,
  onCodeChange,
  onPasswordChange,
  onJoin,
}: {
  user: CurrentUser;
  code: string;
  password: string;
  busy: boolean;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onJoin: () => void;
}) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">WELCOME, {user.name.toUpperCase()}</p>
        <h1>Find a spot to play together.</h1>
      </div>
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
