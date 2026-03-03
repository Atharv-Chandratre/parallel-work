import { describe, it, expect } from "vitest";
import { getLinkType } from "@/lib/linkUtils";

describe("getLinkType", () => {
  it("returns github for github.com URLs", () => {
    expect(getLinkType("https://github.com/owner/repo")).toBe("github");
    expect(getLinkType("https://www.github.com/owner/repo")).toBe("github");
    expect(getLinkType("https://gist.github.com/user/123")).toBe("github");
  });

  it("returns slack for slack.com URLs", () => {
    expect(getLinkType("https://slack.com/archives/C123")).toBe("slack");
    expect(getLinkType("https://workspace.slack.com/archives/C123")).toBe("slack");
  });

  it("returns decision-systems for ops.doordash.team decision-systems URLs", () => {
    expect(
      getLinkType(
        "https://ops.doordash.team/decision-systems/dynamic-values-v2/experiments/67b12aa0-6e5e-4985-be2b-cbda5ada8fa2"
      )
    ).toBe("decision-systems");
    expect(getLinkType("https://ops.doordash.team/decision-systems/something")).toBe(
      "decision-systems"
    );
  });

  it("returns generic for other URLs", () => {
    expect(getLinkType("https://example.com/page")).toBe("generic");
    expect(getLinkType("https://jira.example.com/issue-123")).toBe("generic");
    expect(getLinkType("https://ops.doordash.team/other-path")).toBe("generic");
  });

  it("returns generic for empty or invalid input", () => {
    expect(getLinkType("")).toBe("generic");
    expect(getLinkType("   ")).toBe("generic");
    expect(getLinkType("not-a-url")).toBe("generic");
  });
});
