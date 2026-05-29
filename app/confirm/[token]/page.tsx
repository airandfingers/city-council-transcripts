import prisma from "@/app/lib/prisma";

type Params = Promise<{ token: string }>;

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: { params: Params }) {
  const { token } = await params;

  const sub = await prisma.subscription.findUnique({
    where: { confirmToken: token },
    select: {
      id: true,
      status: true,
      kind: true,
      city: { select: { name: true, stateCode: true, slug: true } },
      requestedCityName: true,
    },
  });

  if (!sub) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Link not recognized</h1>
        <p className="mt-2 text-sm text-gray-600">
          This confirmation link is invalid or has already been replaced. If you tried to
          confirm a recent signup, request a new email by signing up again.
        </p>
      </main>
    );
  }

  if (sub.status === "PENDING") {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", confirmedAt: new Date() },
    });
  }

  const summary = describeKind(sub.kind, sub.city?.name ?? null, sub.requestedCityName);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">You&apos;re subscribed</h1>
      <p className="mt-2 text-sm text-gray-700">
        Confirmed: {summary}. We&apos;ll email you when there&apos;s something to share.
      </p>
    </main>
  );
}

function describeKind(
  kind: string,
  cityName: string | null,
  requestedCityName: string | null,
): string {
  switch (kind) {
    case "SITE_UPDATES":
      return "general site updates";
    case "CITY_UPDATES":
      return cityName ? `updates for ${cityName}` : "updates for the selected city";
    case "CITY_COVERAGE_REQUEST":
      return requestedCityName
        ? `a coverage request for ${requestedCityName}`
        : "a coverage request";
    default:
      return kind;
  }
}
