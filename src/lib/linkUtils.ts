export type LinkType =
  | "github"
  | "slack"
  | "decision-systems"
  | "jira"
  | "google-drive"
  | "generic";

/**
 * Detects the type of link from a URL for displaying the appropriate icon.
 */
export function getLinkType(url: string): LinkType {
  if (!url || typeof url !== "string") return "generic";
  const lower = url.trim().toLowerCase();
  try {
    const parsed = new URL(lower);
    const host = parsed.hostname;

    if (host.includes("github.com") || host.endsWith(".github.com")) {
      return "github";
    }
    if (host.includes("slack.com") || host.endsWith(".slack.com")) {
      return "slack";
    }
    if (host.includes("ops.doordash.team") && lower.includes("decision-systems")) {
      return "decision-systems";
    }
    if (host.includes("atlassian.net") || host.endsWith(".atlassian.net")) {
      return "jira";
    }
    if (host === "docs.google.com" || host === "drive.google.com") {
      return "google-drive";
    }
  } catch {
    // Invalid URL, treat as generic
  }
  return "generic";
}
