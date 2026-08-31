"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { loadCatalog } from "@/lib/parts/catalog";
import { vehicleLabel } from "@/lib/parts/format";
import { priceState } from "@/lib/parts/price";
import { findPart } from "@/lib/parts/query";
import { rateLimit } from "@/lib/rate-limit";
import { recaptchaMessage, verifyRecaptcha } from "@/lib/recaptcha";
import { site } from "@/lib/site";
import { absoluteUrl } from "@/lib/site";

/**
 * "What do you want for this one?"
 *
 * A quarter of the yard reaches the site with no price on it -- 9,236 parts the
 * supplier has not costed. They are worth showing, because a customer who can
 * see the part exists will ask about it, and until now asking meant picking up
 * the phone. This is the same question in writing.
 *
 * The part is identified from the URL and looked up here, on the server. The
 * browser sends who is asking, never what they are asking about. That is the
 * same rule the checkout follows for prices, for the same reason: a form field
 * is a suggestion, and an enquiry that arrived describing a part nobody could
 * verify would be worth less than no enquiry at all.
 *
 * The result is that sales receives a message naming the item, the vehicle, the
 * stock number and the page it came from, so the first reply can be the price
 * rather than "which one?".
 */

const MAX_LENGTHS = {
  name: 100,
  email: 254,
  phone: 30,
  message: 2000,
} as const;

const PriceRequestSchema = z.object({
  /** Which part, as it appears in the URL. Verified against the catalogue. */
  urgId: z.string().trim().min(1).max(40),
  invNumber: z.string().trim().min(1).max(40),

  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(MAX_LENGTHS.name),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(MAX_LENGTHS.email)
    .email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number.")
    .max(MAX_LENGTHS.phone),
  /** Optional: the part itself is the question. Anything else is extra. */
  message: z.string().trim().max(MAX_LENGTHS.message).default(""),
  recaptchaToken: z.string().default(""),
});

type PriceRequestFields = z.infer<typeof PriceRequestSchema>;

export type PriceRequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof PriceRequestFields, string>>;
  /**
   * What was typed, handed back so a rejected form can be filled in again.
   *
   * React empties a form once its action has run, so without this a mistyped
   * email address also threw away the message. Absent on success, which is
   * when emptying the form is right.
   */
  values?: Partial<Record<keyof PriceRequestFields, string>>;
};

function submitted(
  data: FormData,
): Partial<Record<keyof PriceRequestFields, string>> {
  const values: Record<string, string> = {};

  for (const [key, value] of data.entries()) {
    // Regenerated per attempt, and the part is not something anybody typed.
    if (key === "recaptchaToken" || key === "urgId" || key === "invNumber") {
      continue;
    }
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

/** Rate limited per client, as the other public forms are. */
async function clientKey(): Promise<string> {
  const header = await headers();
  const forwarded = header.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `price-request:${forwarded || header.get("x-real-ip") || "unknown"}`;
}

export async function requestPartPrice(
  _previous: PriceRequestState,
  formData: FormData,
): Promise<PriceRequestState> {
  const parsed = PriceRequestSchema.safeParse({
    urgId: formData.get("urgId"),
    invNumber: formData.get("invNumber"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message") ?? "",
    recaptchaToken: formData.get("recaptchaToken") ?? "",
  });

  if (!parsed.success) {
    const errors: PriceRequestState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof PriceRequestFields;
      errors[field] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      errors,
      values: submitted(formData),
    };
  }

  const { urgId, invNumber, name, email, phone, message, recaptchaToken } =
    parsed.data;

  const limit = rateLimit(await clientKey(), {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message: `You have sent several enquiries already. Please try again in ${Math.ceil(limit.retryAfter / 60)} minutes, or call us on ${site.contact.phone}.`,
      values: submitted(formData),
    };
  }

  const captcha = await verifyRecaptcha(recaptchaToken, "price_request");
  if (!captcha.ok) {
    return {
      status: "error",
      message: recaptchaMessage(captcha.reason),
      values: submitted(formData),
    };
  }

  /*
    The part, from the catalogue rather than from the form. If it is not there
    it has sold since the page was rendered, which is ordinary for used parts
    and worth saying plainly rather than sending sales an enquiry about
    something that no longer exists.
  */
  const { parts } = await loadCatalog();
  const part = findPart(parts, urgId, invNumber);

  if (!part) {
    return {
      status: "error",
      message: `That part has just been sold or withdrawn. Call us on ${site.contact.phone} and we will look for another.`,
      values: submitted(formData),
    };
  }

  if (priceState(part.price) !== "on-request") {
    // This part has a price on the page. Nothing to ask for.
    return {
      status: "error",
      message: "This part is priced online, so you can add it to your cart.",
      values: submitted(formData),
    };
  }

  const itemName = part.itemName ?? "Used part";
  const vehicle = vehicleLabel(part);
  const stock = part.stockNo ?? "not recorded";
  const pageUrl = absoluteUrl(`/product/${part.urgId}/${part.invNumber}`);

  // Names the part, so the first reply can be the price rather than a question.
  const subject = [
    "Price request:",
    itemName,
    vehicle && `- ${vehicle}`,
    part.stockNo && `(stock ${part.stockNo})`,
  ]
    .filter(Boolean)
    .join(" ");

  const enquiry = [
    `${name} has asked for a price on a part that is not costed online.`,
    "",
    "PART",
    `  Item:      ${itemName}`,
    `  Vehicle:   ${vehicle || "not recorded"}`,
    `  Stock no:  ${stock}`,
    `  Inv/URG:   ${part.invNumber} / ${part.urgId}`,
    `  Page:      ${pageUrl}`,
    "",
    "CUSTOMER",
    `  Name:      ${name}`,
    `  Email:     ${email}`,
    `  Phone:     ${phone}`,
    "",
    ...(message ? ["THEIR MESSAGE", message] : ["No extra message."]),
  ].join("\n");

  const toSales = await sendEmail({
    to: site.contact.email,
    subject,
    text: enquiry,
    // So a reply from the inbox goes straight back to the customer.
    replyTo: email,
  });

  if (!toSales.ok) {
    return {
      status: "error",
      message: `Sorry, we could not send your enquiry just now. Please call us on ${site.contact.phone} or email ${site.contact.email}.`,
      values: submitted(formData),
    };
  }

  /*
    The enquiry to sales is what matters; the customer's confirmation is a
    courtesy, so a failure there is logged rather than reported as a failure to
    somebody whose message did in fact arrive.
  */
  await sendEmail({
    to: email,
    replyTo: site.contact.email,
    subject: `We have your price request: ${itemName}`,
    text: [
      `Hi ${name},`,
      "",
      "Thanks for asking. We have your request and will come back to you with a price.",
      "",
      `  Item:     ${itemName}`,
      ...(vehicle ? [`  Vehicle:  ${vehicle}`] : []),
      `  Stock no: ${stock}`,
      `  Page:     ${pageUrl}`,
      "",
      `If it is urgent, call us on ${site.contact.phone} and quote stock number ${stock}.`,
      "",
      site.name,
      site.address.displayLine,
    ].join("\n"),
  });

  return {
    status: "success",
    message:
      "Thanks, we have your request. We will be in touch with a price shortly.",
  };
}
