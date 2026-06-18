import type { NextConfig } from "next";

const productionBasePath = "/ai-literacy-planner";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NODE_ENV === "production" ? productionBasePath : "",
};

export default nextConfig;
