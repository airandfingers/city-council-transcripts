import Image from "next/image";

/**
 * Provider-agnostic donate button. The destination URL is read from
 * NEXT_PUBLIC_DONATE_URL (defaults to PayPal.me if unset). Swap providers
 * by changing one env var — no code change needed.
 */

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? "https://paypal.me/RNakano";

export default function DonateButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      <Image
        src="/loris-notes.png"
        alt=""
        aria-hidden
        width={20}
        height={20}
        className="rounded-full"
      />
      Support the Counciloris
    </a>
  );
}
