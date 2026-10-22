import type { MetadataRoute } from "next";
import { FALLBACK_SITE_URL } from "@/app/lib/siteUrl";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;

// AI/LLM training and scraping crawlers — walking every transcript page
// unthrottled is what drove Neon's data-transfer quota over its cap.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "PerplexityBot",
  "Google-Extended",
  "Amazonbot",
  "meta-externalagent",
  "Applebot-Extended",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "Timpibot",
];

// SEO-tool and backlink crawlers, plus search engines with no audience for
// US city councils. None of them send visitors, and every page they fetch is
// an ISR read against the shared Vercel quota (FIX-CRAWLER-BUDGET-001).
// Search engines that do send visitors (Googlebot, Bingbot, which also
// feeds DuckDuckGo and Yahoo, Applebot, DuckDuckBot) and OAI-SearchBot
// (ChatGPT search results) stay allowed: blocking them would cost SEO.
const SEO_TOOL_CRAWLERS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "Barkrowler",
  "serpstatbot",
  "PetalBot",
  "YandexBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...[...AI_CRAWLERS, ...SEO_TOOL_CRAWLERS].map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
