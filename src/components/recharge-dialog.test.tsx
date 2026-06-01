import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RechargeButton } from "./recharge-dialog";

describe("RechargeButton", () => {
  test("renders a leading icon when provided", () => {
    render(<RechargeButton icon={<span data-testid="recharge-icon" />} />);

    expect(screen.getByRole("button", { name: "充值积分" })).toContainElement(screen.getByTestId("recharge-icon"));
  });

  test("opens a recharge dialog with Alipay credit packs", () => {
    render(<RechargeButton />);

    fireEvent.click(screen.getByRole("button", { name: "充值积分" }));

    expect(screen.getByRole("dialog", { name: "充值积分" })).toBeInTheDocument();
    expect(screen.getByText("体验包")).toBeInTheDocument();
    expect(screen.getByText("创作包")).toBeInTheDocument();
    expect(screen.getByText("工作室包")).toBeInTheDocument();
    expect(screen.getByText("¥19.90")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /创作包/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /体验包/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: /工作室包/ }));
    expect(screen.getByRole("button", { name: /创作包/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /工作室包/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("应付金额: ¥49.90")).toBeInTheDocument();
  });

  test("renders English recharge copy", () => {
    render(<RechargeButton locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Recharge credits" }));

    expect(screen.getByRole("dialog", { name: "Recharge credits" })).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Creator/ })).toHaveAttribute("aria-pressed", "true");
  });
});
