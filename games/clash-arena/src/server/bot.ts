import { clamp, type Fighter } from "./model.js";
export function botInput(bot: Fighter, foe: Fighter, seed: number, frame: number): void {
  const gap = foe.x - bot.x;
  const near = Math.abs(gap) < 1.35;
  const beat = (seed + frame * 17) % 97;
  bot.input.x = clamp(gap * 0.65, -1, 1);
  bot.input.y = near && beat < 18 ? 0.8 : 0;
  bot.input.a = near && beat === 3;
  bot.input.b = near && beat === 19;
  bot.input.xButton = near && beat === 41;
  bot.input.yButton = near && bot.meter >= 25 && beat === 61;
  if (near && beat === 77) {
    bot.input.a = true;
    bot.input.b = true;
  }
}
