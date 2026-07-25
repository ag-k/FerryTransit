import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("unsupported WebView fallback", () => {
  it("is configured as Capacitor's error page", () => {
    const config = projectFile("capacitor.config.ts");

    expect(config).toContain("errorPath: 'unsupported-webview.html'");
  });

  it("provides an accessible update path without modern JavaScript", () => {
    const html = projectFile("src/public/unsupported-webview.html");

    expect(html).toContain('lang="ja"');
    expect(html).toContain('aria-labelledby="update-title"');
    expect(html).toContain("com.google.android.webview");
    expect(html).not.toMatch(/<script\b/i);
  });
});
