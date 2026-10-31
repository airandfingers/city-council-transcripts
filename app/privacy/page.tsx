import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/app/lib/siteUrl";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Counciloris stores, who helps us run it, and how to change or delete your subscription.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 dark:text-gray-300 max-w-prose">{children}</div>
    </section>
  );
}

// What we promise visitors. Keep this page in step with the code: Subscriber and Subscription in
// prisma/schema.prisma, app/lib/email.ts.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Privacy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: October 30, 2026</p>

      <Section title="The short version">
        <p>
          You can read everything on Counciloris without an account. We don&apos;t sell your information, and we
          don&apos;t run advertising or analytics trackers on this site.
        </p>
      </Section>

      <Section title="What we store">
        <p>
          If you subscribe to alerts, we store your email address, what you subscribed to and how often you want
          email, so we can send it. If you email us, we keep that message so we can reply.
        </p>
      </Section>

      <Section title="Services that help run the site">
        <p>
          Vercel hosts the site, Neon hosts the database and Resend delivers our email. Hosts keep routine server
          logs, which can include IP addresses.
        </p>
        <p>Links to meeting videos go to YouTube or the city&apos;s own site, whose privacy policies apply there.</p>
      </Section>

      <Section title="Your choices">
        <p>
          Every email has a link to change or end your subscription. To see, correct or delete what we hold about
          you, write to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="Do Not Track">
        <p>We don&apos;t track visitors across other websites, so Do Not Track signals don&apos;t change anything here.</p>
      </Section>

      <Section title="Children">
        <p>This site isn&apos;t directed at children under 13.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>
      </Section>
    </main>
  );
}
