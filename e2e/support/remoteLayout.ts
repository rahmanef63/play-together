import { expect, type FrameLocator, type Page } from "@playwright/test";

export const landscapePhoneViewports = [
  { width: 667, height: 375 },
  { width: 740, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
] as const;

export async function expectRemoteLandscapeGeometry(page: Page, frame: FrameLocator) {
  for (const viewport of landscapePhoneViewports) {
    await page.setViewportSize(viewport);
    const landscape = await frame.locator("body").evaluate(() => {
      const bounds = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing landscape element: ${selector}`);
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };
      return {
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        chassis: bounds(".console-shell__chassis"),
        controls: bounds(".builtin-controller"),
        stick: bounds('[data-control-id="steer"]'),
        right: bounds(".builtin-controller__zone--right"),
        bottom: bounds('.builtin-controller__zone--bottom[data-system-actions="true"]'),
      };
    });
    expect(landscape.scrollWidth).toBeLessThanOrEqual(landscape.viewportWidth + 1);
    expect(landscape.scrollHeight).toBeLessThanOrEqual(landscape.viewportHeight + 1);
    for (const box of [
      landscape.chassis,
      landscape.controls,
      landscape.stick,
      landscape.right,
      landscape.bottom,
    ]) {
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.top).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(landscape.viewportWidth + 1);
      expect(box.bottom).toBeLessThanOrEqual(landscape.viewportHeight + 1);
    }
    expect(landscape.stick.width).toBeGreaterThanOrEqual(landscape.viewportHeight * 0.42);
    expect(landscape.stick.height).toBeCloseTo(landscape.stick.width, 0);
    expect(landscape.bottom.height).toBeGreaterThanOrEqual(34);
  }
}
