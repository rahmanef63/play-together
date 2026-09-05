import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  type BrowserSupport,
  displayCompatibilityMessage,
  secureChannelId,
} from "../apps/web/src/shared/browserSupport";

const supported: BrowserSupport = {
  modules: true,
  secureCrypto: true,
  sockets: true,
  gameSyntax: true,
  webgl2: true,
  tv: true,
};

describe("TV compatibility without unsafe browser bypasses", () => {
  it("accepts a feature-complete device instead of blocking it by television brand", () => {
    expect(displayCompatibilityMessage(supported)).toBeNull();
  });
  it("distinguishes lobby support from the immutable 3D engine requirement", () => {
    expect(displayCompatibilityMessage({ ...supported, gameSyntax: false })).toContain(
      "lobby and QR sign-in",
    );
    expect(displayCompatibilityMessage({ ...supported, webgl2: false })).toContain("WebGL 2");
  });
  it("does not replace secure integrity checks with a compatibility shortcut", () => {
    expect(displayCompatibilityMessage({ ...supported, secureCrypto: false })).toContain(
      "secure connection",
    );
    expect(displayCompatibilityMessage({ ...supported, sockets: false })).toContain(
      "secure connection",
    );
  });
  it("creates bounded random channel IDs without requiring crypto.randomUUID", () => {
    const first = secureChannelId(),
      second = secureChannelId();
    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toBe(second);
  });
  it("explains unsupported browsers before application modules execute", () => {
    const title = { textContent: "" },
      message = { textContent: "" };
    const context = vm.createContext({
      window: {},
      BigInt: undefined,
      document: {
        readyState: "complete",
        createElement: () => ({}),
        getElementById: (id: string) => (id === "boot-title" ? title : message),
      },
    });
    new vm.Script(readFileSync("apps/web/public/browser-check.js", "utf8")).runInContext(context);
    expect(title.textContent).toContain("needs an update");
    expect(message.textContent).toContain("JavaScript modules");
    expect(message.textContent).toContain("secure cryptography");
  });
  it("keeps the standalone help independent of modules, framework or credentials", () => {
    const html = readFileSync("apps/web/public/tv.html", "utf8");
    expect(html).toContain("/tv-check.js");
    expect(html).toContain("<noscript>");
    expect(html).not.toContain('type="module"');
    for (const name of ["browser-check.js", "tv-check.js"]) {
      const source = readFileSync(`apps/web/public/${name}`, "utf8");
      expect(source).not.toMatch(/\bconst\b|\blet\b|=>|\?\.|\bimport\s/);
      expect(source).not.toMatch(/eval\s*\(|new Function/);
    }
  });
});
