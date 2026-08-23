import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Blog images still live on the WordPress server while the migration is in
     * progress, so they are loaded from there during development.
     *
     * This is temporary and must not survive cutover: the whole point of the
     * move is that the site stops depending on WordPress. `scripts/
     * download-blog-media.mjs` copies them locally, after which this entry goes
     * and the paths become /blog-media/... .
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "blog.centralcoastautoparts.com.au",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
