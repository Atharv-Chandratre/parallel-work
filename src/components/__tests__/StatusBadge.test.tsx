import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "@/components/StatusBadge";
import { TaskStatus } from "@/lib/types";

describe("StatusBadge", () => {
  const statuses: { status: TaskStatus; label: string }[] = [
    { status: "todo", label: "To Do" },
    { status: "queued", label: "Queued" },
    { status: "in-review", label: "In Review" },
    { status: "done", label: "Done" },
  ];

  statuses.forEach(({ status, label }) => {
    it(`renders correct label "${label}" for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('applies pulse animation for "queued" status only', () => {
    const { container, rerender } = render(<StatusBadge status="queued" />);
    const dots = container.querySelectorAll("span > span");
    const dot = dots[0];
    expect(dot.className).toContain("animate-pulse");

    rerender(<StatusBadge status="todo" />);
    const dotsAfter = container.querySelectorAll("span > span");
    expect(dotsAfter[0].className).not.toContain("animate-pulse");
  });
});
