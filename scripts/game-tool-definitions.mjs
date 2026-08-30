const idSchema = {
  type: "string",
  description: "Kebab-case game id under games/<id>.",
  pattern: "^[a-z0-9][a-z0-9-]{1,63}$",
};
const versionSchema = { type: "string", description: "Semantic game version x.y.z." };
const sourceSchema = {
  type: "string",
  description:
    "Optional complete TypeScript source. Values are written only inside the selected game slice.",
};
const controlsSchema = {
  type: "array",
  description:
    "Declarative control tokens: stick, dpad, touchpad, a, b, x, y, l1, r1, l2, r2, start, select.",
  items: { type: "string" },
};
const modesSchema = {
  type: "array",
  description: "Supported runtime modes.",
  items: { type: "string", enum: ["shared-screen", "handheld"] },
};

export const GAME_TOOL_DEFINITIONS = [
  {
    action: "list",
    mcpName: "game_list",
    msoName: "game.list",
    description:
      "List every discovered game slice, current version, controller topology, and immutable release state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    action: "get",
    mcpName: "game_get",
    msoName: "game.get",
    description:
      "Read one game config, package metadata, controller topology, and historical release records.",
    inputSchema: {
      type: "object",
      properties: { id: idSchema },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    action: "create",
    mcpName: "game_create",
    msoName: "game.create",
    description:
      "Create one validated draft game vertical slice. This never publishes to production.",
    inputSchema: {
      type: "object",
      properties: {
        id: idSchema,
        title: { type: "string" },
        description: { type: "string" },
        minPlayers: { type: "integer" },
        maxPlayers: { type: "integer" },
        orientation: { type: "string", enum: ["portrait", "landscape", "adaptive"] },
        layout: { type: "string", enum: ["gamepad", "arcade", "racing", "flight", "touch"] },
        controls: controlsSchema,
        modes: modesSchema,
        serverSource: sourceSchema,
        displaySource: sourceSchema,
        testSource: sourceSchema,
      },
      required: ["id", "title", "description", "minPlayers", "maxPlayers"],
      additionalProperties: false,
    },
  },
  {
    action: "update",
    mcpName: "game_update",
    msoName: "game.update",
    description:
      "Update one game slice with optimistic version protection. Published versions require a greater newVersion before any byte change.",
    inputSchema: {
      type: "object",
      properties: {
        id: idSchema,
        expectedVersion: versionSchema,
        newVersion: versionSchema,
        title: { type: "string" },
        description: { type: "string" },
        minPlayers: { type: "integer" },
        maxPlayers: { type: "integer" },
        orientation: { type: "string", enum: ["portrait", "landscape", "adaptive"] },
        layout: { type: "string", enum: ["gamepad", "arcade", "racing", "flight", "touch"] },
        controls: controlsSchema,
        modes: modesSchema,
        serverSource: sourceSchema,
        displaySource: sourceSchema,
        testSource: sourceSchema,
      },
      required: ["id", "expectedVersion"],
      additionalProperties: false,
    },
  },
  {
    action: "delete",
    mcpName: "game_delete",
    msoName: "game.delete",
    description:
      "Delete an unpublished draft game slice. Refuses any game that already has an immutable release.",
    inputSchema: {
      type: "object",
      properties: { id: idSchema },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    action: "validate",
    mcpName: "game_validate",
    msoName: "game.validate",
    description:
      "Validate one game with discovery, TypeScript, unit tests, and bundle build without publishing.",
    inputSchema: {
      type: "object",
      properties: { id: idSchema },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    action: "publish",
    mcpName: "game_publish",
    msoName: "game.publish",
    description:
      "Create one local immutable game release after validation. Production Convex registration remains main-branch CI only.",
    inputSchema: {
      type: "object",
      properties: { id: idSchema },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    action: "registry",
    mcpName: "game_registry",
    msoName: "game.registry",
    description: "Regenerate the dynamic portal game registry from all game.config.json slices.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    action: "prompt",
    mcpName: "game_prompt",
    msoName: "game.prompt",
    description:
      "Return the canonical full game-submission prompt extracted from docs/submitting-games.md.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];
