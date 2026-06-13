import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully client-side (the 3D runs in the browser), so we emit a
  // static export. This lets Vercel serve it as a plain static site via a root
  // vercel.json — no dashboard "Root Directory" change required.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
