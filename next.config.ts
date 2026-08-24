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

  /**
   * Old addresses that external links still point at.
   *
   * The current site handles these in the browser, which means the redirect
   * only happens once JavaScript has run and search engines see a page that
   * answers 200 at both addresses. Here they are real 301s, so the link equity
   * moves and the duplicate stops being served.
   */
  async redirects() {
    return [{ source: "/ProductsPage", destination: "/products", permanent: true }];
  },
};

export default nextConfig;
