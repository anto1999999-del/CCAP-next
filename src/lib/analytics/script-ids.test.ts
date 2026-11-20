import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THIRD_PARTY_GLOBALS, THIRD_PARTY_SCRIPT_IDS } from "./script-ids";

describe("third-party script ids", () => {
  const ids = Object.values(THIRD_PARTY_SCRIPT_IDS);

  it("never reuse a global one of the scripts reads from window", () => {
    const globals = THIRD_PARTY_GLOBALS.map((name) => name.toLowerCase());
    for (const id of ids) {
      expect(globals).not.toContain(id.toLowerCase());
    }
  });

  it("are prefixed, so a future id cannot collide by accident", () => {
    for (const id of ids) expect(id).toMatch(/^ccap-script-/);
  });

  it("are all different", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("are the only ids the loader gives a script tag", () => {
    const loader = readFileSync(
      path.resolve(__dirname, "../../components/layout/ThirdParty.tsx"),
      "utf8",
    );
    // A literal id="..." in the loader would bypass the list above.
    expect(loader).not.toMatch(/<Script[^>]*\sid="/);
    expect(loader.match(/id=\{THIRD_PARTY_SCRIPT_IDS\.\w+\}/g)).toHaveLength(3);
  });
});
