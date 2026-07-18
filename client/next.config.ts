import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  // @dnd/shared is symlinked from ../packages/shared; widen Turbopack's
  // root to the monorepo so it resolves files outside client/.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
