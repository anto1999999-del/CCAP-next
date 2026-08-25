import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ResetForms";

export const metadata: Metadata = {
  title: "Forgotten Password | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

// Reads configuration, so it cannot be decided at build time.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
