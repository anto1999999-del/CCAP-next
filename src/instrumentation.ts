/**
 * Work the server does on its own, started once when it boots.
 *
 * Only the order sweep for now: "On Their Way" orders become "Delivered" four
 * days later (see src/lib/orders/auto-deliver.ts). Node only, and never during
 * `next build`, which loads this file too.
 */

const HOUR_MS = 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.ORDER_AUTO_DELIVER?.trim() !== "true") return;

  const { deliverDueOrders } = await import("./lib/orders/deliver-sweep");

  const run = () => {
    deliverDueOrders().catch((error) => {
      console.error("[auto-deliver] sweep failed:", error);
    });
  };

  run();
  // unref: the timer alone never keeps the process alive at shutdown.
  setInterval(run, HOUR_MS).unref();
}
