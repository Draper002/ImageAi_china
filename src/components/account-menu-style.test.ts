import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("account menu responsive styles", () => {
  test("pins the account menu to the top right on phone and tablet layouts", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.account-menu,\s*\.account-menu-sidebar\s*\{[\s\S]*top:\s*0\.75rem/s);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.account-menu,\s*\.account-menu-sidebar\s*\{[\s\S]*right:\s*0\.75rem/s);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.account-menu,\s*\.account-menu-sidebar\s*\{[\s\S]*bottom:\s*auto/s);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.account-popover\s*\{[\s\S]*top:\s*4rem/s);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.account-popover\s*\{[\s\S]*right:\s*0/s);
  });
});
