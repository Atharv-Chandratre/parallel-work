import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LinkIcon from "@/components/LinkIcon";

describe("LinkIcon", () => {
  it("renders for github URL", () => {
    const { container } = render(<LinkIcon url="https://github.com/owner/repo" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("renders for slack URL", () => {
    const { container } = render(<LinkIcon url="https://slack.com/archives/C123" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders for decision-systems URL", () => {
    const { container } = render(
      <LinkIcon url="https://ops.doordash.team/decision-systems/dynamic-values-v2/experiments/123" />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders for generic URL", () => {
    const { container } = render(<LinkIcon url="https://example.com/doc" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies size prop", () => {
    const { container } = render(<LinkIcon url="https://github.com/x" size={20} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });
});
