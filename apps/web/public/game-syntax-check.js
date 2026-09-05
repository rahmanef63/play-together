// Isolated ES2022 probe. Older browsers may reject this file while the lighter lobby still loads.
class GameSyntaxProbe {
  #value = 1;
  static ready = false;
  static {
    this.ready = true;
  }
  read() {
    return this.#value ?? 0;
  }
}
window.__PT_GAME_SYNTAX__ = GameSyntaxProbe.ready && new GameSyntaxProbe().read() === 1;
