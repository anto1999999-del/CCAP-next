import { beforeAll, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { renderBody, excerptFrom } from "./render";
import { toSlug } from "./schema";
import { MAX_UPLOAD_BYTES, mediaPath, storeImage } from "../media/store";

/**
 * The parts of the content system that are pure enough to check.
 *
 * The rendering and the upload path are where a mistake is invisible until it
 * is on a public page: a body that renders differently in the editor than on
 * the site, or a file that reaches the disk without being decoded first.
 */

describe("markdown rendering", () => {
  it("renders what the toolbar produces", () => {
    const html = renderBody(
      [
        "## Checking a used gearbox",
        "",
        "Look for **metal in the oil** and _listen_ on the test drive.",
        "",
        "- Check the fluid",
        "- Check the mounts",
        "",
        "[Call us](/contact)",
      ].join("\n"),
      "markdown",
    );

    expect(html).toContain("<h2>Checking a used gearbox</h2>");
    expect(html).toContain("<strong>metal in the oil</strong>");
    expect(html).toContain("<em>listen</em>");
    expect(html).toContain("<li>Check the fluid</li>");
    expect(html).toContain('<a href="/contact">Call us</a>');
  });

  it("keeps an inserted image", () => {
    const html = renderBody("![A gearbox](/media/2026/08/gearbox.webp)", "markdown");
    expect(html).toContain('src="/media/2026/08/gearbox.webp"');
    expect(html).toContain('alt="A gearbox"');
  });

  it("shows markup typed into markdown as text rather than running it", () => {
    const html = renderBody(
      '<script>steal()</script><img src=x onerror="steal()">',
      "markdown",
    );

    // Escaped, not stripped: somebody who types a tag into an article meant to
    // write about the tag, and should see what they typed.
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
  });

  it("strips anything executable from HTML", () => {
    const html = renderBody(
      '<p>Fine</p><script>steal()</script><img src=x onerror="steal()">',
      "html",
    );

    expect(html).toContain("<p>Fine</p>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("steal()");
    expect(html).not.toContain("onerror");
  });

  it("leaves a link to another page on this site alone", () => {
    // The importer already rewrote in-article links to their new paths. Putting
    // /blog in front of them again produced /blog/blog/... on 64 links.
    const html = renderBody('<a href="/blog/car-wreckers-central-coast">x</a>', "html");
    expect(html).toContain('href="/blog/car-wreckers-central-coast"');

    expect(renderBody('[Call us](/contact)', "markdown")).toContain(
      'href="/contact"',
    );
  });

  it("still points a link at the old blog subdomain back at this site", () => {
    const html = renderBody(
      '<a href="https://blog.centralcoastautoparts.com.au/car-wreckers-central-coast/">x</a>',
      "html",
    );

    expect(html).toContain('href="/blog/car-wreckers-central-coast"');
  });

  it("leaves imported HTML alone", () => {
    const article = "<h2>Faults</h2><table><tr><td>Cerato</td></tr></table>";
    const html = renderBody(article, "html");

    expect(html).toContain("<table>");
    expect(html).toContain("<td>Cerato</td>");
  });

  it("writes an excerpt from the body when nobody has written one", () => {
    const excerpt = excerptFrom(
      "## Heading\n\nThe first sentence of the article carries on for a while.",
      "markdown",
      40,
    );

    expect(excerpt).not.toContain("<");
    expect(excerpt).not.toContain("#");
    expect(excerpt.endsWith("...")).toBe(true);

    // Cut at a word: every word in the excerpt is a whole word from the source.
    const source = "Heading The first sentence of the article carries on for a while.";
    for (const word of excerpt.replace("...", "").split(" ")) {
      expect(source.split(" ")).toContain(word);
    }
  });
});

describe("addresses", () => {
  it("makes a URL out of a title", () => {
    expect(toSlug("2019 KIA CERATO 2.0 SEDAN")).toBe("2019-kia-cerato-2-0-sedan");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(toSlug("Citroën C4")).toBe("citroen-c4");
  });
});

describe("serving uploaded images", () => {
  it("refuses a path that climbs out of the media directory", () => {
    expect(mediaPath(["..", "..", ".env"])).toBeNull();
    expect(mediaPath(["2026", "08", "../../.env"])).toBeNull();
    expect(mediaPath(["2026", "08", "engine.webp"])).not.toBeNull();
  });
});

describe("storing an upload", () => {
  // Into a temporary directory, so running the tests does not leave files in
  // the one the site serves from.
  beforeAll(async () => {
    process.env.MEDIA_DIR = await mkdtemp(path.join(tmpdir(), "ccap-media-"));
  });

  /** A real image, made here rather than committed as a fixture. */
  async function png(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 30, b: 40 },
      },
    })
      .png()
      .toBuffer();
  }

  function asFile(bytes: Buffer, name: string, type: string): File {
    return new File([new Uint8Array(bytes)], name, { type });
  }

  it("re-encodes to WebP and caps the width", async () => {
    const result = await storeImage(
      asFile(await png(2400, 1200), "IMG_2054.PNG", "image/png"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.image.width).toBe(1600);
    expect(result.image.url).toMatch(/^\/media\/\d{4}\/\d{2}\/img-2054-[0-9a-f]{8}\.webp$/);
  });

  it("refuses a file that is not an image, whatever it claims", async () => {
    const result = await storeImage(
      asFile(Buffer.from("<?php system($_GET[0]); ?>"), "shell.png", "image/png"),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a type that is not an accepted image", async () => {
    const result = await storeImage(
      asFile(await png(100, 100), "notes.svg", "image/svg+xml"),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses anything over a megabyte", async () => {
    // Noise, because a flat colour compresses to almost nothing.
    const noisy = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
        noise: { type: "gaussian", mean: 128, sigma: 60 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(noisy.length).toBeGreaterThan(MAX_UPLOAD_BYTES);

    const result = await storeImage(asFile(noisy, "big.png", "image/png"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("1MB");
  });
});
