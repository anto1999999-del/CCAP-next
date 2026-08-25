import ContactForm from "./ContactForm";
import SectionHeading from "./layout/SectionHeading";

/**
 * The contact block.
 *
 * Appears at the foot of Home, About, Gallery and Contact. The heading and
 * intro are server-rendered; only the form itself is interactive.
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
    <section className={`bg-admin px-4 py-14 text-white sm:px-6 md:py-20 ${className}`}>
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          className="mb-8 md:mb-10"
          eyebrow="Central Coast NSW"
          title="Contact Us"
          intro="Have a question or need assistance? Our team is here to help. Fill in the form below and we'll get back to you as soon as possible."
        />
        <ContactForm />
      </div>
    </section>
  );
}
