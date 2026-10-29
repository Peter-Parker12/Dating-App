import path from "node:path";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // In production Caddy routes /api and /socket.io; these rewrites serve local dev only.
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${apiOrigin}/socket.io/:path*` },
    ];
  },
};
