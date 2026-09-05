import type { ConnectionStatus } from "@play-together/browser-runtime";
import { navigate } from "../../../shared/navigation";
import { Button } from "../../../shared/ui/Button";

export function PlayToolbar({
  code,
  status,
  connection,
  onMenu,
}: {
  code: string;
  status: string;
  connection: ConnectionStatus;
  onMenu: () => void;
}) {
  return (
    <header className="play-toolbar">
      <Button variant="ghost" type="button" onClick={() => navigate(`/room/${code}`)}>
        ← Room
      </Button>
      <div>
        <strong>{status}</strong>
        <span className={`connection connection--${connection}`}>{connection}</span>
      </div>
      <div className="play-toolbar__actions">
        <Button variant="ghost" type="button" onClick={onMenu} aria-haspopup="dialog">
          Menu
        </Button>
      </div>
    </header>
  );
}
