import type { Metadata } from "next";
import Link from "next/link";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import GlossaryList from "./GlossaryList";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Plain-language explanations of the procedural and civic terms used across meeting summaries and transcripts.",
};

export default function GlossaryPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link href="/" className="hover:underline">
          Cities
        </Link>
        {" / Glossary"}
      </nav>

      <h1 className="text-3xl font-bold mb-2">Glossary</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-prose">
        Plain-language explanations of procedural and civic terms that show up across meeting
        summaries and transcripts — motions and votes, zoning and housing terms, transit
        acronyms, and more. Many of these terms are also click-to-expand right where they
        appear on the site.
      </p>

      <GlossaryList />

      <AIDisclaimer />
    </main>
  );
}
