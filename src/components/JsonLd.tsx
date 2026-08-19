/**
 * Renders a block of structured data.
 *
 * A server component, so the JSON-LD is in the initial HTML. The old site
 * injected these tags from a `useEffect` after React mounted, which works for
 * Google (it renders JavaScript) but leaves the data invisible to every other
 * crawler and to social scrapers, and delays it for Google too.
 *
 * `data` is always built from literals in our own code, never from user input,
 * so there is nothing here that needs escaping beyond what JSON.stringify does.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
