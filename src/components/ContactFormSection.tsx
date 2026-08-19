import ContactForm from "./ContactForm";

/**
 * The "Contact Us – Central Coast NSW" block.
 *
 * Appears at the foot of Home, About, Sell Your Car and Contact. The heading,
 * intro and rule are server-rendered; only the form itself is interactive.
 *
 * On the current site this block lives inside the footer, which decides whether
 * to show it by inspecting the URL against two hardcoded lists of paths. That
 * forces the entire footer to run in the browser and means adding a page
 * involves remembering to update those lists. Here it is a section a page
 * chooses to include, so the decision sits with the page that owns it.
 */
export default function ContactFormSection({
  className = "",
}: {
  className?: string;
}) {
  return (
    <section
      className={`bg-admin px-4 py-14 text-white sm:px-6 md:py-20 ${className}`}
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center md:mb-10">
          <h2 className="text-brand mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.5rem]">
            Contact Us – Central Coast NSW
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
            Have a question or need assistance? Our team is here to help. Fill in
            the form below and we&apos;ll get back to you as soon as possible.
          </p>
          <div className="bg-brand mx-auto mt-5 h-[3px] w-12 rounded-full" />
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
