import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the standalone output-file-tracing root to this project. Without it,
  // Next infers the workspace root from the nearest lockfile and (when a stray
  // lockfile exists in a parent dir, e.g. ~/) nests server.js under a subpath
  // instead of the standalone bundle root. zeroBox spawns ./server.js from the
  // bundle root, so the entry must sit there. cwd === project root during
  // `next build` (the deploy CLI runs it from here), and stays portable across
  // machines/CI — unlike a hardcoded absolute path.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
