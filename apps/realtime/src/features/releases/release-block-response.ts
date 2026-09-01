export const RELEASE_BLOCK_RESPONSE = {
  closeCode: 4003,
  closeReason: "release blocked",
  message: {
    type: "error",
    code: "RELEASE_BLOCKED",
    message: "This game release was blocked by the host and the live room was stopped",
    fatal: true,
  },
} as const;
