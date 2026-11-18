import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { isAuthorised } from "./override-auth";
import {
  applyOverride,
  isOverridePath,
  parseOverrideInput,
  partMeta,
  renderPartPattern,
} from "./overrides";
import { site } from "../site";

const TOKEN = "a".repeat(64);

describe("override precedence", () => {
  const blog: Metadata = {
    title: "The post's own SEO title",
    description: "The post's own description.",
    alternates: { canonical: "/blog/hilux-problems" },
    openGraph: {
      type: "article",
      title: "The post's own SEO title",
      description: "The post's own description.",
      url: "/blog/hilux-problems",
      images: [{ url: "/cover.jpg" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "The post's own SEO title",
      description: "The post's own description.",
    },
  };

  it("leaves the page alone when there is no override", () => {
    expect(applyOverride("/blog/hilux-problems", blog, null)).toBe(blog);
    expect(applyOverride("/blog/hilux-problems", blog, {})).toBe(blog);
    expect(
      applyOverride("/blog/hilux-problems", blog, {
        metaTitle: "  ",
        metaDescription: null,
      }),
    ).toBe(blog);
  });

  it("wins over the built-in title and description, in every tag", () => {
    const result = applyOverride("/blog/hilux-problems", blog, {
      metaTitle: "New title",
      metaDescription: "New description.",
    });

    expect(result.title).toBe("New title");
    expect(result.description).toBe("New description.");
    expect(result.openGraph).toMatchObject({
      title: "New title",
      description: "New description.",
      // Everything the page had set that is not text is kept.
      type: "article",
      url: "/blog/hilux-problems",
      images: [{ url: "/cover.jpg" }],
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "New title",
      description: "New description.",
    });
    expect(result.alternates).toEqual({ canonical: "/blog/hilux-problems" });
  });

  it("changes only the field the override has", () => {
    const result = applyOverride("/blog/hilux-problems", blog, {
      metaTitle: "New title",
    });

    expect(result.title).toBe("New title");
    expect(result.description).toBe("The post's own description.");
    expect(result.openGraph).toMatchObject({
      title: "New title",
      description: "The post's own description.",
    });
  });

  it("keeps the share image and site name on a page that inherited them", () => {
    const contact: Metadata = {
      title: "Contact Us",
      description: "Get in touch.",
      alternates: { canonical: "/contact" },
    };

    const result = applyOverride("/contact", contact, {
      metaDescription: "Call the yard.",
    });

    expect(result.openGraph).toMatchObject({
      siteName: site.name,
      title: "Contact Us",
      description: "Call the yard.",
      url: "/contact",
      images: [{ url: site.logo }],
    });
  });

  it("gives the home page, which states no title, the site's title to share", () => {
    const home: Metadata = { alternates: { canonical: "/" } };
    const result = applyOverride("/", home, { metaDescription: "New." });

    expect(result.title).toBeUndefined();
    expect(result.openGraph).toMatchObject({
      title: site.title,
      description: "New.",
    });
  });
});

describe("part template", () => {
  const builtIn = { title: "Built-in title", description: "Built-in text." };
  const full = {
    part: "Alternator",
    vehicle: "2015 Toyota HiLux",
    stockNo: "A1234",
  };

  it("fills every placeholder", () => {
    expect(
      renderPartPattern("{part} to suit {vehicle} | Stock {stockNo}", full),
    ).toBe("Alternator to suit 2015 Toyota HiLux | Stock A1234");
  });

  it("uses the template for a part with a vehicle", () => {
    expect(
      partMeta(
        {
          titlePattern: "Used {part} for {vehicle} | CCAP",
          descriptionPattern: "{part} for {vehicle}, stock {stockNo}.",
        },
        full,
        builtIn,
      ),
    ).toEqual({
      title: "Used Alternator for 2015 Toyota HiLux | CCAP",
      description: "Alternator for 2015 Toyota HiLux, stock A1234.",
    });
  });

  it("keeps today's no-vehicle wording for a part without a vehicle", () => {
    expect(
      partMeta(
        {
          titlePattern: "Used {part} for {vehicle} | CCAP",
          descriptionPattern: "{part} for {vehicle}.",
        },
        { ...full, vehicle: "" },
        builtIn,
      ),
    ).toEqual(builtIn);
  });

  it("falls back one field at a time", () => {
    expect(
      partMeta(
        {
          titlePattern: "Used {part} for {vehicle}",
          descriptionPattern: "Stock {stockNo}.",
        },
        { ...full, stockNo: "" },
        builtIn,
      ),
    ).toEqual({
      title: "Used Alternator for 2015 Toyota HiLux",
      description: "Built-in text.",
    });
  });

  it("is the built-in wording when there is no template", () => {
    expect(partMeta(null, full, builtIn)).toEqual(builtIn);
    expect(partMeta({}, full, builtIn)).toEqual(builtIn);
  });
});

describe("auth", () => {
  it("accepts the token as a bearer", () => {
    expect(isAuthorised(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isAuthorised(null, TOKEN)).toBe(false);
    expect(isAuthorised("", TOKEN)).toBe(false);
    expect(isAuthorised(TOKEN, TOKEN)).toBe(false);
    expect(isAuthorised(`Basic ${TOKEN}`, TOKEN)).toBe(false);
    expect(isAuthorised(`Bearer ${TOKEN}x`, TOKEN)).toBe(false);
    expect(isAuthorised(`Bearer ${"b".repeat(64)}`, TOKEN)).toBe(false);
  });

  it("is closed when the server has no token, or a weak one", () => {
    expect(isAuthorised("Bearer ", undefined)).toBe(false);
    expect(isAuthorised("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorised("Bearer ", "")).toBe(false);
    expect(isAuthorised("Bearer short", "short")).toBe(false);
  });
});

describe("input", () => {
  it("accepts a page override", () => {
    expect(
      parseOverrideInput({
        path: "/blog/hilux-problems",
        metaTitle: " A title ",
        metaDescription: "",
        changeId: "C-001",
      }),
    ).toEqual({
      ok: true,
      value: {
        path: "/blog/hilux-problems",
        kind: "page",
        metaTitle: "A title",
        metaDescription: undefined,
        changeId: "C-001",
      },
    });
  });

  it("accepts the part template", () => {
    const parsed = parseOverrideInput({
      path: "template:part",
      titlePattern: "Used {part} for {vehicle}",
      changeId: "C-002",
    });
    expect(parsed.ok && parsed.value.kind).toBe("template");
  });

  it.each([
    ["no text at all", { path: "/about", changeId: "C" }],
    ["no changeId", { path: "/about", metaTitle: "T" }],
    ["a title over 70", { path: "/about", metaTitle: "x".repeat(71), changeId: "C" }],
    ["a description over 170", { path: "/about", metaDescription: "x".repeat(171), changeId: "C" }],
    ["HTML", { path: "/about", metaTitle: "<b>Bold</b>", changeId: "C" }],
    ["a full URL", { path: "https://example.com/about", metaTitle: "T", changeId: "C" }],
    ["a trailing slash", { path: "/about/", metaTitle: "T", changeId: "C" }],
    ["a query string", { path: "/products?page=2", metaTitle: "T", changeId: "C" }],
    ["a template with no pattern", { path: "template:part", metaTitle: "T", changeId: "C" }],
    ["an unknown placeholder", { path: "template:part", titlePattern: "{make} {part}", changeId: "C" }],
    ["something that is not an object", "nope"],
  ])("refuses %s", (_, body) => {
    expect(parseOverrideInput(body).ok).toBe(false);
  });

  it("knows a path from a non-path", () => {
    expect(isOverridePath("/")).toBe(true);
    expect(isOverridePath("/wreckers/toyota")).toBe(true);
    expect(isOverridePath("template:part")).toBe(true);
    expect(isOverridePath("template:other")).toBe(false);
    expect(isOverridePath("about")).toBe(false);
    expect(isOverridePath("//evil.example")).toBe(false);
  });
});
