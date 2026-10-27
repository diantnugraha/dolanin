import { describe, expect, it } from "vitest";
import { isBot } from "@/lib/tracking";

describe("isBot", () => {
  it("treats missing or empty UA as bot", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("")).toBe(true);
  });
  it.each(["Googlebot/2.1", "facebookexternalhit/1.1", "WhatsApp/2.23", "TelegramBot", "Slackbot-LinkExpanding"])(
    "flags %s",
    (ua) => expect(isBot(ua)).toBe(true),
  );
  it("passes a normal Chrome Android UA", () => {
    expect(
      isBot("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"),
    ).toBe(false);
  });
});
