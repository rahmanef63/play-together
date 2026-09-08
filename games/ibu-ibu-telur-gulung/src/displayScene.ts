import { drawSprite, type Sprite } from "./displaySprites.js";
import type { Enemy, Hero, TelurState } from "./types.js";

const WORLD_WIDTH = 900;
const WORLD_HEIGHT = 420;

export function renderScene(
  g: CanvasRenderingContext2D,
  state: TelurState | null,
  heroSprite: Sprite | undefined,
  enemySprite: Sprite | undefined,
  width: number,
  height: number,
): void {
  drawMarket(g, width, height);
  if (!state) return;
  const sx = width / WORLD_WIDTH;
  const sy = height / WORLD_HEIGHT;
  g.save();
  g.scale(sx, sy);
  drawHud(g, state);
  drawPickups(g, state);
  drawShots(g, state);
  for (const hero of state.heroes) drawHero(g, state, hero, heroSprite);
  for (const enemy of state.enemies) drawEnemy(g, state, enemy, enemySprite);
  if (state.phase === "ready") drawBanner(g, "TEKAN START · SIAP GULUNG!", "#ffd86b");
  if (state.phase === "victory") drawBanner(g, "SEMUA SUDAH TERGULUNG!", "#82e6a8");
  if (state.phase === "gameover") drawBanner(g, "GEROBAK TUMBANG · COBA LAGI", "#ff8b91");
  g.restore();
}

function drawMarket(g: CanvasRenderingContext2D, width: number, height: number): void {
  const sky = g.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#34546b");
  sky.addColorStop(0.55, "#f2a36d");
  sky.addColorStop(1, "#f8d7a0");
  g.fillStyle = sky;
  g.fillRect(0, 0, width, height);
  const sx = width / WORLD_WIDTH;
  const sy = height / WORLD_HEIGHT;
  g.save();
  g.scale(sx, sy);
  for (let x = 0; x < WORLD_WIDTH; x += 120) {
    g.fillStyle = (x / 120) % 2 === 0 ? "#b84d45" : "#d99045";
    g.fillRect(x, 175, 108, 10);
    g.fillStyle = "#5d4a44";
    g.fillRect(x + 8, 185, 92, 108);
    g.fillStyle = "#2f3d43";
    g.fillRect(x + 20, 202, 28, 28);
    g.fillStyle = "#f3cb66";
    g.fillRect(x + 60, 209, 6, 8);
  }
  g.fillStyle = "#3a3437";
  g.fillRect(0, 300, WORLD_WIDTH, 120);
  g.fillStyle = "#6a5b52";
  g.fillRect(0, 300, WORLD_WIDTH, 5);
  for (let x = 0; x < WORLD_WIDTH; x += 72) {
    g.fillStyle = "#7d7166";
    g.fillRect(x, 338, 34, 3);
  }
  g.restore();
}

function drawHud(g: CanvasRenderingContext2D, state: TelurState): void {
  g.fillStyle = "rgba(30, 28, 36, 0.78)";
  g.fillRect(14, 12, 390, 46);
  g.fillStyle = "#fff0c9";
  g.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  g.fillText(`IBU-IBU TELUR GULUNG · WAVE ${state.wave}`, 24, 29);
  const totalScore = state.heroes.reduce((sum, hero) => sum + hero.score, 0);
  g.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  g.fillStyle = "#f4b95e";
  g.fillText(`${state.phase.toUpperCase()} · SCORE ${totalScore}`, 24, 47);
}

function drawPickups(g: CanvasRenderingContext2D, state: TelurState): void {
  for (const pickup of state.pickups) {
    g.fillStyle = pickup.kind === "sauce" ? "#d83f45" : "#fff1a6";
    g.beginPath();
    g.arc(pickup.x, pickup.y - 12, 10, 0, Math.PI * 2);
    g.fill();
    if (pickup.kind === "egg") {
      g.fillStyle = "#f4b83c";
      g.fillRect(pickup.x - 3, pickup.y - 15, 6, 6);
    }
  }
}

function drawShots(g: CanvasRenderingContext2D, state: TelurState): void {
  for (const shot of state.shots) {
    g.fillStyle = shot.kind === "sauce" ? "#e84449" : shot.kind === "enemy" ? "#5c293b" : "#ffd85a";
    g.beginPath();
    g.arc(shot.x, shot.y, shot.kind === "sauce" ? 7 : 5, 0, Math.PI * 2);
    g.fill();
    if (shot.kind === "egg") {
      g.strokeStyle = "#fff1aa";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(shot.x - 5, shot.y, 8, -1.1, 1.1);
      g.stroke();
    }
  }
}

function drawHero(
  g: CanvasRenderingContext2D,
  state: TelurState,
  hero: Hero,
  sprite: Sprite | undefined,
): void {
  const animation =
    hero.invulnerableMs > 0
      ? "hurt"
      : hero.y < 298
        ? "jump"
        : hero.fireCd > 120 || hero.input.fire
          ? "fire"
          : Math.abs(hero.input.move) > 0.08
            ? "run"
            : "idle";
  if (!drawSprite(g, sprite, animation, state.elapsedMs, hero.x - 24, hero.y - 64, 56, 56)) {
    g.fillStyle = "#ec7e9d";
    g.fillRect(hero.x - 14, hero.y - 50, 28, 38);
    g.fillStyle = "#313442";
    g.fillRect(hero.x - 10, hero.y - 34, 20, 23);
  }
  g.fillStyle = "#fff0cc";
  g.font = "700 12px ui-monospace, monospace";
  g.fillText(
    `HP ${hero.hp} · SAUS ${hero.sauce} · x${hero.combo} · ${hero.score}`,
    hero.x - 35,
    hero.y + 16,
  );
}

function drawEnemy(
  g: CanvasRenderingContext2D,
  state: TelurState,
  enemy: Enemy,
  sprite: Sprite | undefined,
): void {
  const forcedFrame =
    enemy.kind === "boss" ? "boss" : enemy.kind === "shield" ? "shield" : undefined;
  const scale = enemy.kind === "boss" ? 1.8 : 1;
  const size = 52 * scale;
  if (
    !drawSprite(
      g,
      sprite,
      "walk",
      state.elapsedMs + enemy.x * 4,
      enemy.x - size / 2,
      enemy.y - size,
      size,
      size,
      forcedFrame,
    )
  ) {
    g.fillStyle = enemy.kind === "boss" ? "#713746" : "#c83a38";
    g.fillRect(enemy.x - 15 * scale, enemy.y - 42 * scale, 30 * scale, 34 * scale);
  }
  g.fillStyle = "#3b1f2a";
  g.fillRect(enemy.x - 22 * scale, enemy.y - 58 * scale, 44 * scale, 5);
  g.fillStyle = "#7bd06d";
  g.fillRect(
    enemy.x - 22 * scale,
    enemy.y - 58 * scale,
    44 * scale * Math.max(0, enemy.hp / enemy.maxHp),
    5,
  );
}

function drawBanner(g: CanvasRenderingContext2D, label: string, color: string): void {
  g.fillStyle = "rgba(22, 20, 29, 0.84)";
  g.fillRect(190, 158, 520, 72);
  g.fillStyle = color;
  g.font = "800 24px ui-monospace, SFMono-Regular, Menlo, monospace";
  g.textAlign = "center";
  g.fillText(label, 450, 188);
  g.textAlign = "start";
}
