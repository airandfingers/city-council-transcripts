import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { isAuthorized } from "@/app/lib/publish";

/**
 * GET /api/admin/alerts
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Returns DRAFTED and SENT_TO_ADMINS alerts, newest first.
 * Consumed by the Flask operator dashboard to render the alert list.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { status: { in: ["DRAFTED", "SENT_TO_ADMINS"] } },
    orderBy: { createdAt: "desc" },
    include: {
      meeting: { select: { title: true, slug: true } },
      interestArea: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({ alerts });
}
