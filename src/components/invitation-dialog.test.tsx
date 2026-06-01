import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { InvitationButton } from "./invitation-dialog";

describe("InvitationButton", () => {
  test("renders a leading icon when provided", () => {
    render(<InvitationButton icon={<span data-testid="invite-icon" />} label="我的邀请" />);

    expect(screen.getByRole("button", { name: "我的邀请" })).toContainElement(screen.getByTestId("invite-icon"));
  });
});
