import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { mountPreview } from "./mount.mjs";
import { createScenario } from "./scenario.mjs";
export async function captureGame(browser, origin, game, output) {
  const frames = resolve(process.cwd(), ".local/preview-frames", game.id);
  await mkdir(frames, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 960, height: 540 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const scenario = await createScenario(game);
  try {
    await page.goto(`${origin}/__game_preview__`);
    await mountPreview(page, game, scenario);
    for (let i = 0; i < 60; i++) {
      await page.evaluate((message) => window.previewSnapshot(message), await scenario.advance());
      await page.waitForTimeout(50);
      await page.screenshot({ path: resolve(frames, `${String(i).padStart(3, "0")}.png`) });
    }
    if (errors.length) throw new Error(`${game.id}: ${errors.join("; ")}`);
    const cover = resolve(output, `${game.id}.webp`),
      video = resolve(output, `${game.id}.mp4`);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-i",
      resolve(frames, "015.png"),
      "-frames:v",
      "1",
      "-quality",
      "82",
      cover,
    ]);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      "20",
      "-i",
      resolve(frames, "%03d.png"),
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "27",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      video,
    ]);
    // PNG remains available for older shared URLs. It is a capture, not a separate illustration.
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-i",
      cover,
      "-frames:v",
      "1",
      resolve(output, `${game.id}.png`),
    ]);
    const bytes = await readFile(cover);
    const result = {
      gameId: game.id,
      version: game.config.game.version,
      cover: `${game.id}.webp`,
      video: `${game.id}.mp4`,
      coverSha256: createHash("sha256").update(bytes).digest("hex"),
      source: "authoritative-runtime",
      width: 960,
      height: 540,
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    await page.evaluate(() => window.disposePreview?.()).catch(() => {});
    await page.close();
    await scenario.server.dispose?.();
    await rm(frames, { recursive: true, force: true });
  }
}
