import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("login mobile styles", () => {
  test("keeps signup and invite entry compact on phone viewports", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.auth-shell > section\s*\{[\s\S]*padding-block:\s*0\.5rem 1rem/s);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.auth-shell h1\s*\{[\s\S]*font-size:\s*2\.15rem/s);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.auth-shell \.mt-8\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.auth-shell \.panel\s*\{[\s\S]*padding:\s*1rem/s);
  });
});
