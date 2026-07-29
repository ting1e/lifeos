import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "node-cron", "@node-rs/argon2"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default config;
