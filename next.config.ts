import type { NextConfig } from "next";

// Static export — runs on plain Apache/PHP hosting (no Node server).
// All dynamic behaviour is client-side via the Supabase browser client and
// the run-checks edge function.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
