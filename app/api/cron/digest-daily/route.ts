import { NextResponse } from "next/server";
import { sendDueDigests } from "@/app/lib/digest";
import { isCronAuthorized } from "@/app/lib/cronAuth";

/**
 * GET /api/cron/digest-daily
 *
 * Auth: Authorization: Bearer <CRON_SECRET | a CronAuthToken.token row>
 *
 * Bundles every PENDING AlertDelivery with frequency=DAILY into one digest
 * email per subscriber (see app/lib/digest.ts::sendDueDigests).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueDigests("DAILY");
  return NextResponse.json({ ok: true, ...result });
}
