import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { HistoryGrid } from "./history-grid";

vi.mock("@/app/history/actions", () => ({
  deleteGeneration: vi.fn(),
  submitGenerationCase: vi.fn()
}));

describe("HistoryGrid", () => {
  test("shows delete and case submission actions for generated images", () => {
    render(
      <HistoryGrid
        items={[
          {
            id: "gen-1",
            subject: "A premium product bottle",
            aspect_ratio: "1:1",
            style: "studio",
            created_at: "2026-06-01T00:00:00.000Z",
            imageUrl: "https://example.com/image.png",
            status: "succeeded",
            case_submission_status: "none"
          }
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "提交案例" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });

  test("shows pending review state after a case has been submitted", () => {
    render(
      <HistoryGrid
        items={[
          {
            id: "gen-2",
            subject: "A social cover image",
            aspect_ratio: "4:5",
            style: "lifestyle",
            created_at: "2026-06-01T00:00:00.000Z",
            imageUrl: "https://example.com/image.png",
            status: "succeeded",
            case_submission_status: "submitted"
          }
        ]}
      />
    );

    expect(screen.getByText("待审核")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交案例" })).not.toBeInTheDocument();
  });
});
