import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmModal from "@/components/ConfirmModal";

describe("ConfirmModal", () => {
  const defaultProps = {
    title: "Delete project?",
    message: "This will permanently delete the project.",
    confirmLabel: "Delete",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders title, message, and buttons", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Delete project?")).toBeInTheDocument();
    expect(screen.getByText("This will permanently delete the project.")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when backdrop is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByTestId("confirm-modal-backdrop"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("uses default confirmLabel when not provided", () => {
    render(
      <ConfirmModal
        title="Confirm?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not call onCancel when modal content is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Delete project?"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
