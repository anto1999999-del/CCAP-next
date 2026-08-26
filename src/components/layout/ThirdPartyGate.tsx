"use client";

import { usePathname } from "next/navigation";
import ThirdParty from "./ThirdParty";

/**
 * Where the third-party scripts are allowed to run.
 *
 * The same list the help band uses, and for the same reason: the account and
 * admin pages are a tool, not a shopfront. Analytics that counts the yard's own
 * staff working through orders makes the owner's numbers useless, and there is
 * nobody to chat to on a dashboard.
 */
const OFF_ON = [
  "/dashboard",
  "/manage-orders",
  "/manage-users",
  "/manage-blog",
  "/manage-gallery",
  "/my-account",
  "/orders",
  "/login",
  "/forgot-password",
  "/reset-password",
];

export default function ThirdPartyGate() {
  const pathname = usePathname();
  const enabled = !OFF_ON.some((path) => pathname.startsWith(path));

  return <ThirdParty enabled={enabled} />;
}
