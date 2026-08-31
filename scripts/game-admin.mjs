import { createGame } from "./game-admin/create-action.mjs";
import { getGame, listGames, refreshRegistry, validateGame } from "./game-admin/read-actions.mjs";
import { deleteGame, publishGame } from "./game-admin/release-actions.mjs";
import { readSubmissionPrompt } from "./game-admin/repository.mjs";
import { updateGame } from "./game-admin/update-action.mjs";
import { requireId } from "./game-admin/validation.mjs";

export async function runGameTool(action, input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Tool input must be a JSON object");
  if (action === "list") return listGames();
  if (action === "get") return getGame(requireId(input.id));
  if (action === "create") return createGame(input);
  if (action === "update") return updateGame(input);
  if (action === "delete") return deleteGame(requireId(input.id));
  if (action === "validate") return validateGame(requireId(input.id));
  if (action === "publish") return publishGame(requireId(input.id));
  if (action === "registry") return refreshRegistry();
  if (action === "prompt") return { prompt: await readSubmissionPrompt() };
  throw new Error(`Unknown game tool action: ${String(action)}`);
}
