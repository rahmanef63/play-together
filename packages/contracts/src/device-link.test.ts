import { describe, expect, it } from "vitest";
import { formatDeviceCode, parseDeviceCode } from "./device-link.js";

describe("phone-safe device codes", () => {
  it.each([
    "ABCD2345",
    "abcd2345",
    "ABCD-2345",
    " ABCD - 2345 ",
    "ABCD–2345",
    "ABCD—2345",
    "ABCD−2345",
    "ABCD\u00a02345",
    "ＡＢＣＤ－２３４５",
    "ABCD\n2345",
  ])("normalizes %s without truncating the actual code", (value) => {
    expect(parseDeviceCode(value)).toBe("ABCD2345");
    expect(formatDeviceCode(value)).toBe("ABCD-2345");
  });
  it.each([
    "",
    "ABCDEFGI",
    "ABCDEFG0",
    "ABCDEFG1",
    "ABCDEFGＯ",
    "7ac4b5a5b506bd28",
    "ABCD/2345",
    "https://example.com",
    "A".repeat(257),
    null,
    1234,
  ])("rejects malformed or ambiguous input %s", (value) =>
    expect(parseDeviceCode(value)).toBeNull(),
  );
});
