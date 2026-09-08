import type { Enemy, TelurState } from "./types.js";

export function resolveHits(state: TelurState, ground: number): void {
  for (const shot of state.shots) {
    if (shot.kind === "enemy") {
      for (const hero of state.heroes) {
        const hit = Math.hypot(hero.x - shot.x, hero.y - 26 - shot.y) < 25;
        if (hero.hp <= 0 || hero.invulnerableMs || !hit) continue;
        hero.hp = Math.max(0, hero.hp - shot.damage);
        hero.invulnerableMs = 700;
        hero.combo = 0;
        shot.x = -999;
      }
      continue;
    }
    for (const enemy of state.enemies) {
      if (Math.hypot(enemy.x - shot.x, enemy.y - 28 - shot.y) >= 32) continue;
      enemy.hp -= shot.damage;
      shot.x = 999;
      if (enemy.hp <= 0) defeat(state, enemy, shot.owner, ground);
      break;
    }
  }

  for (const hero of state.heroes) {
    for (const pickup of state.pickups) {
      if (Math.hypot(hero.x - pickup.x, hero.y - pickup.y) >= 30) continue;
      if (pickup.kind === "sauce") hero.sauce = Math.min(5, hero.sauce + 1);
      else hero.hp = Math.min(5, hero.hp + 1);
      pickup.x = -999;
    }
  }
}

function defeat(state: TelurState, enemy: Enemy, owner: string | undefined, ground: number): void {
  const hero = state.heroes.find((entry) => entry.id === owner) ?? state.heroes[0];
  if (hero) {
    hero.combo++;
    hero.comboTimer = 2600;
    hero.score += 100 * hero.combo;
  }
  if (enemy.id % 2 === 0) {
    state.pickups.push({
      id: state.next++,
      kind: enemy.id % 4 === 0 ? "sauce" : "egg",
      x: enemy.x,
      y: ground - 12,
    });
  }
}
