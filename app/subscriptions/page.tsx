import prisma from "@/app/lib/prisma";
import { unsubscribe } from "@/app/actions/unsubscribe";
import { updateSubscriptionFrequency } from "@/app/actions/updateFrequency";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import RequestManageLinkForm from "@/app/components/RequestManageLinkForm";

const FREQUENCY_OPTIONS = [
  { value: "INSTANT", label: "Instantly" },
  { value: "DAILY", label: "Daily digest" },
  { value: "WEEKLY", label: "Weekly digest" },
  { value: "MONTHLY", label: "Monthly digest" },
] as const;

const FREQUENCY_ELIGIBLE_KINDS = new Set(["CITY_UPDATES", "TOPIC_IN_CITY_UPDATES"]);

type Search = Promise<{ token?: string }>;

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Manage subscriptions</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          This page requires the access link from one of your subscription emails.
        </p>
        <RequestManageLinkForm />
      </main>
    );
  }

  const anchor = await prisma.subscription.findUnique({
    where: { unsubscribeToken: token },
    select: { subscriberId: true },
  });

  if (!anchor) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Link not recognized</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          This management link is invalid or expired.
        </p>
        <RequestManageLinkForm />
      </main>
    );
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: anchor.subscriberId },
    select: {
      email: true,
      subscriptions: {
        select: {
          id: true,
          kind: true,
          status: true,
          unsubscribeToken: true,
          requestedCityName: true,
          frequency: true,
          city: { select: { name: true, stateCode: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!subscriber) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Manage subscriptions</h1>
      <p className="mt-2 text-sm text-gray-600">{subscriber.email}</p>
      <ul className="mt-6 divide-y divide-gray-200 border border-gray-200 rounded">
        {subscriber.subscriptions.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium">{labelFor(s)}</div>
              <div className="text-xs text-gray-500">{s.status}</div>
              {(s.status === "ACTIVE" || s.status === "PENDING") &&
                FREQUENCY_ELIGIBLE_KINDS.has(s.kind) && (
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const frequency = formData.get("frequency");
                      if (typeof frequency === "string") {
                        await updateSubscriptionFrequency(token, s.id, frequency);
                      }
                    }}
                    className="mt-2"
                  >
                    <select
                      name="frequency"
                      defaultValue={s.frequency}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="text-xs border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </form>
                )}
            </div>
            {s.status === "ACTIVE" || s.status === "PENDING" ? (
              <form
                action={async () => {
                  "use server";
                  await unsubscribe(token, s.id);
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:underline"
                >
                  Unsubscribe
                </button>
              </form>
            ) : (
              <span className="text-xs text-gray-400">Removed</span>
            )}
          </li>
        ))}
      </ul>

      <AIDisclaimer />
    </main>
  );
}

function labelFor(s: {
  kind: string;
  requestedCityName: string | null;
  city: { name: string; stateCode: string } | null;
}): string {
  switch (s.kind) {
    case "SITE_UPDATES":
      return "General site updates";
    case "CITY_UPDATES":
      return s.city
        ? `Updates for ${s.city.name}, ${s.city.stateCode.toUpperCase()}`
        : "Updates for a city";
    case "CITY_COVERAGE_REQUEST":
      return s.requestedCityName
        ? `Coverage request: ${s.requestedCityName}`
        : "Coverage request";
    default:
      return s.kind;
  }
}
