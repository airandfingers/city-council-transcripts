import Link from "next/link";

/**
 * Site-wide 404 (FIX-TRUNCATED-LINKS-001). The common way to land here is a
 * link copied from a video description that was cut short for display, so
 * say that and point somewhere useful instead of a bare "not found".
 * Static: no data, no Neon.
 */
export default function NotFound() {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">We couldn&apos;t find that page</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-prose">
        If you copied this link from a video description, it may have been cut short — long links
        there are often shortened with &ldquo;…&rdquo;. Try opening the link directly from the
        video, or find the meeting by city.
      </p>
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
        Browse meetings by city →
      </Link>
    </main>
  );
}
