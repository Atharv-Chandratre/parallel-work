"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when the client appears to be running on macOS. Defaults
 * to `true` on the server / during the first paint so SSR output and the
 * initial client render agree. Flips to the detected value after hydration.
 */
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    const source =
      typeof navigator !== "undefined" ? `${navigator.platform} ${navigator.userAgent}` : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration: navigator is unavailable during server render, so we detect on the client and flip state once.
    setIsMac(/mac|iphone|ipad|ipod/i.test(source));
  }, []);
  return isMac;
}
