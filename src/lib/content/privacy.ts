/**
 * Privacy & cookie policy.
 *
 * A legal-facing document, kept factual: it describes what the site actually
 * does -- the cookies it sets, the third parties it sends data to, the payment
 * processor -- rather than boilerplate copied from a template that names tools
 * this site does not use. If the analytics, chat or payment providers change,
 * this changes with them. Wording that creates an obligation is the owner's to
 * confirm; nothing here promises more than the site does.
 *
 * Contact details come from lib/site.ts rather than being retyped, so the
 * policy cannot quote an old phone number after the footer changes.
 *
 * Last reviewed 23 September 2026.
 */

import { site } from "@/lib/site";

export type PrivacySection = {
  title: string;
  intro?: string;
  body?: string;
  bulletsIntro?: string;
  bullets?: readonly string[];
};

export const PRIVACY_UPDATED = "23 September 2026";

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    title: "Who we are",
    intro: `This policy explains how ${site.name}, a licensed NSW motor dismantler (${site.contact.licence}) at ${site.address.displayLine}, collects and handles your personal information when you use centralcoastautoparts.com.au.`,
    body: "We handle personal information in line with the Australian Privacy Principles under the Privacy Act 1988 (Cth). By using this website you agree to the practices described below.",
  },
  {
    title: "Information we collect",
    bulletsIntro:
      "We only collect what we need to sell you a part and answer your enquiry:",
    bullets: [
      "Contact details you enter into our forms or at checkout: your name, email address, phone number and delivery address.",
      "Order details: the parts you buy, and the delivery address they ship to.",
      "Account details, if you create an account: your email and a securely hashed password. We never store your password as readable text.",
      "Payment confirmation from our payment processor. We do not see or store your full card number, expiry or security code (see 'Payments' below).",
      "Technical information your browser sends automatically, such as your IP address, device and browser type, and the pages you view, used to keep the site secure and to understand how it is used.",
    ],
  },
  {
    title: "Cookies and similar technologies",
    intro:
      "A cookie is a small file a website stores in your browser. We use them for the site to work, to keep it secure, and to understand how visitors use it. The cookies on this site fall into four groups:",
    bullets: [
      "Essential cookies. These make the site work: they keep you signed in, remember what is in your cart, and protect forms from abuse. The site cannot function without them, so they are always on.",
      "Analytics cookies. Google Analytics and Microsoft Clarity tell us, in aggregate, which pages are visited and how people move through the site, so we can improve it. This data is about patterns, not identifying you personally.",
      "Security. Google reCAPTCHA helps us tell real customers from automated abuse on our forms. Its use is subject to Google's Privacy Policy and Terms of Service.",
      "Live chat. Our Podium chat widget sets cookies so a conversation you start can continue.",
    ],
  },
  {
    title: "How to control cookies",
    intro:
      "You are in control. Every major browser lets you see the cookies a site has set and delete or block them, and you can set your browser to refuse cookies or warn you before accepting one.",
    body: "Blocking essential cookies will stop parts of the site working, such as signing in or checking out. You can opt out of Google Analytics across all sites using Google's browser add-on at tools.google.com/dlpage/gaoptout.",
  },
  {
    title: "How we use your information",
    bulletsIntro: "We use the information we collect to:",
    bullets: [
      "Process your order, arrange delivery or pickup, and send you order and delivery updates.",
      "Answer your enquiries, including price requests and quotes.",
      "Keep the site and your account secure, and prevent fraud and abuse.",
      "Understand and improve how the site is used.",
      "Meet our record-keeping and legal obligations as a licensed dismantler.",
    ],
  },
  {
    title: "Payments",
    intro:
      "Card payments are handled by Stripe, a certified PCI Service Provider Level 1. Your card details are entered directly into Stripe's secure fields and are never sent to or stored on our own systems.",
    body: "We receive only a confirmation that a payment succeeded, and the order it relates to. We keep no record of your card number.",
  },
  {
    title: "Who we share information with",
    bulletsIntro:
      "We do not sell your personal information. We share it only with the services needed to complete your order and run the site:",
    bullets: [
      "Team Global Express, our freight carrier, to quote and arrange delivery of your parts.",
      "Stripe, to process your payment.",
      "Our email provider, to send you order confirmations and reply to enquiries.",
      "Google (Analytics and reCAPTCHA), Microsoft (Clarity) and Podium, as described under cookies above.",
      "Government or law-enforcement bodies where we are required to by law.",
    ],
  },
  {
    title: "How long we keep it",
    body: "We keep order and transaction records for as long as we are required to for tax, warranty and legal purposes. Enquiry and account information is kept while it is useful to you and to us, and removed when it is no longer needed.",
  },
  {
    title: "Your rights",
    intro:
      "You can ask us for a copy of the personal information we hold about you, ask us to correct it if it is wrong, or ask us to delete it where we are not required to keep it.",
    body: "To make a request, or if you have any concern about how we have handled your information, contact us using the details below and we will respond promptly. If you are not satisfied with our response, you can contact the Office of the Australian Information Commissioner at oaic.gov.au.",
  },
  {
    title: "Contact us",
    body: `${site.name}, ${site.address.displayLine}. Phone ${site.contact.phone}. Email ${site.contact.email}.`,
  },
];
