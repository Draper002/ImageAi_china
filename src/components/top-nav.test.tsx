import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TopNav } from "./top-nav";

describe("TopNav", () => {
  test("renders promotion links for examples and feedback", () => {
    render(<TopNav locale="zh" />);

    expect(screen.getByRole("link", { name: "案例赏析" })).toHaveAttribute("href", "/examples");
    expect(screen.getByRole("link", { name: "反馈有礼" })).toHaveAttribute("href", "/feedback");
  });

  test("preserves English locale in promotion links", () => {
    render(<TopNav locale="en" />);

    expect(screen.getByRole("link", { name: "Examples" })).toHaveAttribute("href", "/examples?locale=en");
    expect(screen.getByRole("link", { name: "Rewards" })).toHaveAttribute("href", "/feedback?locale=en");
  });
});
