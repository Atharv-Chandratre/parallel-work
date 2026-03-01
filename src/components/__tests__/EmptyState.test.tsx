import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "@/components/EmptyState";

describe("EmptyState", () => {
  it('renders "No projects yet" heading', () => {
    render(<EmptyState />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders instruction text", () => {
    render(<EmptyState />);
    expect(
      screen.getByText(/Create your first project to start tracking/)
    ).toBeInTheDocument();
  });

  it('mentions "+ Add Project" button', () => {
    render(<EmptyState />);
    expect(screen.getByText(/\+ Add Project/)).toBeInTheDocument();
  });
});
