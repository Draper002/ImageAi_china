import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("create sidebar styles", () => {
  test("keeps dialog trigger buttons typographically aligned with sidebar links", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.create-sidebar \.side-nav-button\s*\{[^}]*font-size:\s*0\.875rem/s);
    expect(css).toMatch(/\.create-sidebar \.side-nav-button\s*\{[^}]*font-weight:\s*600/s);
    expect(css).toMatch(/\.create-sidebar \.side-nav-button\s*\{[^}]*line-height:\s*1\.4285714286/s);
  });
});
