import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and mammoth are Node-only and must not be bundled by Turbopack/webpack.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
