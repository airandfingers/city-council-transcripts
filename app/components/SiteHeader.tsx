import Link from "next/link";
import Image from "next/image";

/**
 * Persistent global navigation header.
 *
 * Gives every page a constant brand + navigation cue, addressing PoC
 * feedback that the site "felt flat" and had no clear sense of where
 * you were or how to get back to the directory.
 */
export default function SiteHeader() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-6 px-8 py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg tracking-tight">
          <Image
            src="/loris-city-skyline.png"
            alt="Counciloris logo"
            width={120}
            height={120}
            className="rounded-full w-20 h-20 md:w-30 md:h-30"
          />
          Counciloris
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cities
          </Link>
          <Link
            href="/#about"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
