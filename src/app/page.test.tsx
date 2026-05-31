import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import HomePage from "./page";

const legacyGptImageWithSpace = new RegExp("GPT " + "Image");
const legacyGptImageNoSpace = new RegExp("GPT" + "Image");
const legacyOpenAi = new RegExp("Open" + "AI");

describe("HomePage", () => {
  test("renders the hero prompt example in Chinese by default", async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("提示词组合")).toBeInTheDocument();
    expect(screen.getByText(/生成一张高端商品图/)).toBeInTheDocument();
    expect(screen.getByText(/通义万相 Wan2\.7/)).toBeInTheDocument();
    expect(screen.queryByText(legacyGptImageWithSpace)).not.toBeInTheDocument();
    expect(screen.queryByText(legacyOpenAi)).not.toBeInTheDocument();
    expect(screen.queryByText(/专业英文 prompt/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a premium product image/)).not.toBeInTheDocument();
  });

  test("renders the hero prompt example in English when locale is English", async () => {
    render(await HomePage({ searchParams: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByText("Prompt stack")).toBeInTheDocument();
    expect(screen.getByText(/Create a premium product image/)).toBeInTheDocument();
    expect(screen.getByText(/Bailian Wan2\.7/)).toBeInTheDocument();
    expect(screen.queryByText(legacyGptImageNoSpace)).not.toBeInTheDocument();
    expect(screen.queryByText(legacyOpenAi)).not.toBeInTheDocument();
  });
});
