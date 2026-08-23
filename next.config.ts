import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Blog and gallery images are served from this site, out of
     * public/blog-media, put there by scripts/download-blog-media.mjs. Nothing
     * is loaded from the WordPress host any more, which is the point of the
     * move: the site does not depend on WordPress being up.
     */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
