import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
  The loader (ThirdParty) brings Google's script in when `wakeWasRequested()`
  is true. These check the one thing that went wrong on the order confirmation:
  an event tracked BEFORE the loader starts listening must still be seen by it.

  gtag.ts keeps its state per page load, so each test loads a fresh copy, and
  the browser's `window` is stood in for by the little of it that track() uses.
*/

type Gtag = typeof import("./gtag");

async function freshPageLoad(): Promise<Gtag> {
  vi.resetModules();
  return import("./gtag");
}

beforeEach(() => {
  vi.stubGlobal("window", { location: { hostname: "example.test" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asking for Google's script when an event is tracked", () => {
  it("is not asked for on a page where nothing has been tracked", async () => {
    const gtag = await freshPageLoad();
    expect(gtag.wakeWasRequested()).toBe(false);
  });

  it("is seen by a loader that mounts after the event (order confirmation)", async () => {
    const gtag = await freshPageLoad();

    // PurchaseTracker's effect runs first...
    gtag.track("purchase", { value: 10 }, { conversion: "purchase" });

    // ...and only then does the loader subscribe and read.
    const told = vi.fn();
    gtag.subscribeWake(told);
    expect(gtag.wakeWasRequested()).toBe(true);
  });

  it("the old way, an event on window, reaches nobody who listens afterwards", () => {
    // Why the request has to be remembered: this is what the code did before.
    const target = new EventTarget();
    target.dispatchEvent(new Event("ccap:analytics-wake"));
    const heard = vi.fn();
    target.addEventListener("ccap:analytics-wake", heard);
    expect(heard).not.toHaveBeenCalled();
  });

  it("tells a loader that is already mounted, straight away and once", async () => {
    const gtag = await freshPageLoad();
    const told = vi.fn();
    gtag.subscribeWake(told);

    gtag.track("phone_click", {});
    gtag.track("phone_click", {});

    expect(told).toHaveBeenCalledTimes(1);
    expect(gtag.wakeWasRequested()).toBe(true);
  });

  it("stops telling a loader that has unsubscribed", async () => {
    const gtag = await freshPageLoad();
    const told = vi.fn();
    const unsubscribe = gtag.subscribeWake(told);
    unsubscribe();

    gtag.track("phone_click", {});

    expect(told).not.toHaveBeenCalled();
  });

  it("queues the event ahead of the script, configuration first", async () => {
    const gtag = await freshPageLoad();
    gtag.track("purchase", { value: 10 });

    const queue = (window.dataLayer ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    );
    expect(queue[0][0]).toBe("js");
    expect(queue[1][0]).toBe("config");
    expect(queue.at(-1)?.slice(0, 2)).toEqual(["event", "purchase"]);
  });
});
