"use client";

import { SiGithub, SiSlack, SiJira, SiGoogledrive } from "react-icons/si";
import { getLinkType, type LinkType } from "@/lib/linkUtils";

type LinkIconProps = {
  url: string;
  size?: number;
  className?: string;
};

function DecisionSystemsIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16v-8" />
      <path d="M17 16V7" />
    </svg>
  );
}

function GenericLinkIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

const ICON_MAP: Record<LinkType, React.ComponentType<{ size?: number; className?: string }>> = {
  github: ({ size, className }) => <SiGithub size={size} className={className} />,
  slack: ({ size, className }) => <SiSlack size={size} className={className} />,
  jira: ({ size, className }) => <SiJira size={size} className={className} />,
  "google-drive": ({ size, className }) => <SiGoogledrive size={size} className={className} />,
  "decision-systems": DecisionSystemsIcon,
  generic: GenericLinkIcon,
};

export default function LinkIcon({ url, size = 14, className }: LinkIconProps) {
  const linkType = getLinkType(url);
  const Icon = ICON_MAP[linkType];
  return <Icon size={size} className={className} />;
}

/**
 * Render the icon for a specific LinkType directly (no URL classification).
 * Used by the Filters popover so link-type chips can show logos.
 */
export function LinkKindIcon({
  kind,
  size = 14,
  className,
}: {
  kind: LinkType;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[kind];
  return <Icon size={size} className={className} />;
}
