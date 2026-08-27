"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { recaptchaMessage, verifyRecaptcha } from "@/lib/recaptcha";
import { site } from "@/lib/site";

/**
 * "Sell your car" offer submission.
 *
 * Same shape as the contact action: validate, throttle, verify, then email
 * sales and confirm to the customer.
 *
 * The fields were named `input1` through `input10` plus `yesNo`, in an order
 * that did not match the form, `input8` is the odometer but sits after
 * `input9`, the mechanical condition. Every read of that data had to be checked
 * against the markup to know what it held, which is exactly how the contact
 * form ended up mailing the subject line in place of the phone number. They
 * have real names here.
 */

const CURRENT_YEAR = new Date().getFullYear();

const SaleOfferSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name.").max(100),
  location: z.string().trim().min(1, "Please enter your location.").max(120),
  phone: z.string().trim().min(1, "Please enter your phone number.").max(30),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254)
    .email("Please enter a valid email address."),
  vehicleModel: z
    .string()
    .trim()
    .min(1, "Please enter the make and model.")
    .max(120),
  // Bounded so a typo cannot produce a nonsense year in the sales inbox.
  vehicleYear: z.coerce
    .number()
    .int()
    .min(1900, "Please check the year.")
    .max(CURRENT_YEAR + 1, "Please check the year."),
  bodyCondition: z
    .string()
    .trim()
    .min(1, "Please describe the body condition.")
    .max(200),
  mechanicalCondition: z
    .string()
    .trim()
    .min(1, "Please describe the mechanical condition.")
    .max(200),
  drivable: z.enum(["yes", "no"], {
    message: "Please tell us whether the vehicle is drivable.",
  }),
  odometer: z.coerce
    .number()
    .int()
    .min(0, "Please check the odometer reading.")
    .max(2_000_000, "Please check the odometer reading."),
  askingPrice: z
    .string()
    .trim()
    .min(1, "Please enter your asking price.")
    .max(50),
  recaptchaToken: z.string().nullable().optional(),
});

type SaleOfferFields = z.infer<typeof SaleOfferSchema>;

export type SaleOfferState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof SaleOfferFields, string>>;
  /**
   * What was typed, sent back so a rejected form can be filled in again.
   *
   * React resets a form once its action has run, so without this every field
   * emptied itself the moment one of them failed validation: somebody who
   * mistyped a year lost the make, the model, the odometer and their phone
   * number along with it.
   *
   * Absent on success, which is when emptying the form is the right thing.
   */
  values?: Partial<Record<keyof SaleOfferFields, string>>;
};

/** Whatever was submitted, as strings, for handing back to the form. */
function submitted(
  data: FormData,
): Partial<Record<keyof SaleOfferFields, string>> {
  const values: Record<string, string> = {};

  for (const [key, value] of data.entries()) {
    // The token is regenerated on every attempt and is not a field anybody
    // filled in.
    if (key === "recaptchaToken") continue;
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip");
  return `sell:${ip || "unknown"}`;
}

export async function submitSaleOffer(
  _previous: SaleOfferState,
  formData: FormData,
): Promise<SaleOfferState> {
  const parsed = SaleOfferSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    const errors: SaleOfferState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SaleOfferFields;
      errors[field] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      errors,
      values: submitted(formData),
    };
  }

  const offer = parsed.data;

  const limit = rateLimit(await clientKey(), {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message: `You have sent several offers already. Please try again in ${Math.ceil(limit.retryAfter / 60)} minutes, or call us on ${site.contact.phone}.`,
      values: submitted(formData),
    };
  }

  const captcha = await verifyRecaptcha(offer.recaptchaToken, "sellyourcar");
  if (!captcha.ok) {
    return {
      status: "error",
      message: recaptchaMessage(captcha.reason),
      values: submitted(formData),
    };
  }

  const summary = [
    `Full name:              ${offer.fullName}`,
    `Location:               ${offer.location}`,
    `Phone:                  ${offer.phone}`,
    `Email:                  ${offer.email}`,
    `Vehicle:                ${offer.vehicleYear} ${offer.vehicleModel}`,
    `Body condition:         ${offer.bodyCondition}`,
    `Mechanical condition:   ${offer.mechanicalCondition}`,
    `Drivable:               ${offer.drivable === "yes" ? "Yes" : "No"}`,
    `Odometer:               ${offer.odometer.toLocaleString("en-AU")} km`,
    `Asking price:           ${offer.askingPrice}`,
  ].join("\n");

  const toSales = await sendEmail({
    to: site.contact.email,
    subject: `Car sale offer: ${offer.vehicleYear} ${offer.vehicleModel}`,
    text: `New car sale offer submitted from the website:\n\n${summary}`,
    replyTo: offer.email,
  });

  if (!toSales.ok) {
    return {
      status: "error",
      message: `Sorry, we could not send your offer just now. Please call us on ${site.contact.phone} or email ${site.contact.email}.`,
      values: submitted(formData),
    };
  }

  const confirmation = [
    `Dear ${offer.fullName},`,
    "",
    "Thank you for submitting your car sale offer. We have received your details and our team will get back to you shortly to discuss it.",
    "",
    "Here is a summary of your submission:",
    "",
    summary,
    "",
    "Regards,",
    site.name,
    site.contact.phone,
  ].join("\n");

  const toCustomer = await sendEmail({
    to: offer.email,
    subject: "Thank you for submitting your car sale offer",
    text: confirmation,
    replyTo: site.contact.email,
  });

  if (!toCustomer.ok) {
    console.warn(
      `[sell-your-car] Offer from ${offer.email} reached sales, but their confirmation did not send.`,
    );
  }

  return {
    status: "success",
    message:
      "Thanks, your offer has been sent. Our team will be in touch shortly.",
  };
}
