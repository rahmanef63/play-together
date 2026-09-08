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
      <p className="eyebrow">{user.name.toUpperCase()}</p>
      <form
        className="join-inline"
        onSubmit={(event) => {
          event.preventDefault();
          onJoin();
        }}
      >
        <label>
          <span>Room code</span>
          <input
            aria-label="Room code"
            placeholder="Code or invitation link"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            maxLength={512}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            aria-label="Room password"
            placeholder="Optional"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <Button type="submit" busy={busy}>
          Join
        </Button>
      </form>
    </section>
  );
}
