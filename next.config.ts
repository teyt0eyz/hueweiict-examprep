import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// GitHub Pages serves the site at https://teyt0eyz.github.io/huewei-exam-prep/
// In dev we run at the root so `npm run dev` works at http://localhost:3000/
const repo = "huewei-exam-prep";
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: isProd ? `/${repo}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_DATA_VERSION: Date.now().toString(36) },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
