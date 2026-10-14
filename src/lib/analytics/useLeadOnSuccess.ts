"use client";

import { useEffect } from "react";
import { trackLead } from "./gtag";

/**
 * Records a lead when a form's server action comes back successful.
 *
 * Keyed on the state object the action returns, which is new for every
 * submission: two genuine enquiries are two leads, while a re-render of the
 * same success is not counted again. Nothing fires on the button press, so an
 * enquiry the server refused (a bad email, a failed reCAPTCHA) is never
 * counted as a conversion.
 */
export function useLeadOnSuccess(
  state: { status: string },
  formName: Parameters<typeof trackLead>[0],
): void {
  useEffect(() => {
    if (state.status === "success") trackLead(formName);
  }, [state, formName]);
}
