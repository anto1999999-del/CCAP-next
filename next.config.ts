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
    return [
      { source: "/ProductsPage", destination: "/products", permanent: true },
      { source: "/MyAccount", destination: "/my-account", permanent: true },
      /*
        /sitemap.xml is the address every crawler and every SEO tool tries
        first, and the one the current live site answers. Next reserves it for
        its own metadata route and then serves a 404 there, so this points it
        at the index we build instead. Without it, replacing the live site
        turns a working sitemap into a 404 on day one.
      */
      { source: "/sitemap.xml", destination: "/sitemap_index.xml", permanent: true },
    ];
  },
};

export default nextConfig;
