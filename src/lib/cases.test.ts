import { describe, expect, test } from "vitest";
import { caseStatusLabel, fallbackCaseExamples, normalizeCaseTags } from "./cases";

describe("cases", () => {
  test("normalizes case tags without empty values", () => {
    expect(normalizeCaseTags(" product , , social cover,Product ")).toEqual(["product", "social cover"]);
  });

  test("labels case workflow statuses for admin and history surfaces", () => {
    expect(caseStatusLabel("submitted", "en")).toBe("Pending review");
    expect(caseStatusLabel("approved", "en")).toBe("Accepted");
    expect(caseStatusLabel("rejected", "en")).toBe("Rejected");
    expect(caseStatusLabel(null, "en")).toBe("Not submitted");
  });

  test("ships with public fallback examples for the first promotion page", () => {
    expect(fallbackCaseExamples).toHaveLength(3);
    expect(fallbackCaseExamples[0]).toMatchObject({
      title: expect.any(String),
      prompt: expect.stringContaining("product"),
      imageUrl: expect.stringContaining("https://")
    });
  });
});
