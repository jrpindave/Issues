import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // web-ifc ships a .wasm we serve from /public/wasm — nothing to bundle.
  // Keep the build lean and static-exportable for Vercel.
  reactStrictMode: true,
};

export default nextConfig;
