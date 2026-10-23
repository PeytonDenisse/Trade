import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext also inspects multipart POSTs before dispatching API routes. Leave
  // room for form metadata around the API's existing 5 MB image limit.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
