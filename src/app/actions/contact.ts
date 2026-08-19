"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { recaptchaMessage, verifyRecaptcha } from "@/lib/recaptcha";
import { site } from "@/lib/site";

/**
 * Contact form submission.
 *
 * A server action rather than an API route: the form posts straight to it, the
 * secrets stay on the server, and there is no public endpoint to find and
 * hammer.
 *
 * Three faults in the version this replaces are fixed here, and all three were
 * visible in production:
 *
 * 1. **Phone and subject were swapped in the email to sales.** The form sent
 *    `input3` as subject and `input4` as phone; the handler read them the other
 *    way round, so every enquiry reaching the sales inbox showed the subject
 *    line where the customer's phone number should be.
 *
 * 2. **Customers received two confirmations.** The handler sent one, then the
 *    browser called a second endpoint that sent another.
 *
 * 3. **Nothing was validated server-side.** Fields were interpolated into the
 *    email exactly as received, at any length.
 */

const MAX_LENGTHS = {
  name: 100,
  email: 254, // the practical maximum for an address
  subject: 150,
  phone: 30,
  message: 4000,
} as const;

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(MAX_LENGTHS.name),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(MAX_LENGTHS.email)
    .email("Please enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(1, "Please enter a subject.")
    .max(MAX_LENGTHS.subject),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number.")
    .max(MAX_LENGTHS.phone),
  message: z
    .string()
    .trim()
    .min(1, "Please enter your message.")
    .max(MAX_LENGTHS.message),
  recaptchaToken: z.string().nullable().optional(),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Field-level errors, keyed by field name. */
  errors?: Partial<Record<keyof z.infer<typeof ContactSchema>, string>>;
};

/**
 * Best-effort client identity for rate limiting.
 *
 * Behind LiteSpeed the socket address is the proxy, so the forwarded header is
 * what identifies the visitor. It is spoofable, which is why this is a
 * throttle rather than a security control — reCAPTCHA does that job.
 */
async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip");
  return `contact:${ip || "unknown"}`;
}

export async function submitContactForm(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    recaptchaToken: formData.get("recaptchaToken"),
  });

  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof z.infer<typeof ContactSchema>;
      errors[field] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      errors,
    };
  }

  const { name, email, subject, phone, message, recaptchaToken } = parsed.data;

  // Five submissions an hour is generous for a genuine enquiry and useless to
  // anyone using the form as a relay.
  const limit = rateLimit(await clientKey(), {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message: `You have sent several messages already. Please try again in ${Math.ceil(limit.retryAfter / 60)} minutes, or call us on ${site.contact.phone}.`,
    };
  }

  const captcha = await verifyRecaptcha(recaptchaToken, "contact");
  if (!captcha.ok) {
    return { status: "error", message: recaptchaMessage(captcha.reason) };
  }

  const enquiry = [
    "New contact form submission from the website:",
    "",
    `Full name: ${name}`,
    `Email:     ${email}`,
    `Phone:     ${phone}`,
    `Subject:   ${subject}`,
    "",
    "Message:",
    message,
  ].join("\n");

  // The enquiry to sales is what matters; the customer's confirmation is a
  // courtesy. So the outcome reported to the visitor follows the first, and a
  // failed confirmation is logged rather than shown to them as a failure.
  const toSales = await sendEmail({
    to: site.contact.email,
    subject: `New enquiry: ${subject}`,
    text: enquiry,
    // Lets the team reply straight to the customer from their inbox.
    replyTo: email,
  });

  if (!toSales.ok) {
    return {
      status: "error",
      message: `Sorry — we could not send your message just now. Please call us on ${site.contact.phone} or email ${site.contact.email}.`,
    };
  }

  const confirmation = [
    `Hi ${name},`,
    "",
    `Thanks for contacting ${site.name}. We have received your message and will get back to you shortly.`,
    "",
    "What you sent us:",
    `  Subject: ${subject}`,
    `  Phone:   ${phone}`,
    "",
    message,
    "",
    "Regards,",
    `${site.name}`,
    site.contact.phone,
  ].join("\n");

  const toCustomer = await sendEmail({
    to: email,
    subject: "We received your message",
    text: confirmation,
    replyTo: site.contact.email,
  });

  if (!toCustomer.ok) {
    console.warn(
      `[contact] Enquiry from ${email} reached sales, but their confirmation did not send.`,
    );
  }

  return {
    status: "success",
    message: "Thanks — your message has been sent. We will be in touch shortly.",
  };
}
