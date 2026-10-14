import { describe, expect, it } from "vitest";
import { adsSendTo } from "./gtag";
import { phoneLinkLocation } from "./locations";

describe("Google Ads conversion target", () => {
  it("is the tag id and the label", () => {
    expect(adsSendTo("AW-123456789", "AbC-dEf")).toBe("AW-123456789/AbC-dEf");
  });

  it("is skipped when either half is missing, so only GA4 sends", () => {
    expect(adsSendTo("", "AbC")).toBeNull();
    expect(adsSendTo("AW-123456789", "")).toBeNull();
    expect(adsSendTo("  ", "  ")).toBeNull();
  });
});

describe("where a phone number was tapped", () => {
  it("uses the location a link names for itself", () => {
    expect(phoneLinkLocation("/product/nw42/1", "footer")).toBe("footer");
    expect(phoneLinkLocation("/", "help_band")).toBe("help_band");
  });

  it("otherwise names the page", () => {
    expect(phoneLinkLocation("/product/nw42/88880")).toBe("product_page");
    expect(phoneLinkLocation("/contact")).toBe("contact_page");
    expect(phoneLinkLocation("/")).toBe("home_page");
    expect(phoneLinkLocation("/wreckers/toyota")).toBe("make_page");
    expect(phoneLinkLocation("/somewhere-new")).toBe("other_page");
  });

  it("ignores an empty label", () => {
    expect(phoneLinkLocation("/contact", "  ")).toBe("contact_page");
  });
});
