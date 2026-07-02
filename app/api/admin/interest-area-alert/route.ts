import { NextResponse } from "next/server";
import { z } from "zod";
import { createInterestAreaAlert, sendAlertToAdmins } from "@/app/lib/alerts";
import { isAuthorized } from "@/app/lib/publish";

const InterestAreaAlertBody = z.object({
  interest_area_id: z.number().int().positive(),
});

/**
 * POST /api/admin/interest-area-alert
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "interest_area_id": <number> }
 *
 * Called by the Python interest-area feed consumer when a notify-worthy
 * event is detected for an interest area. Creates an INTEREST_AREA_UPDATED
 * alert from the area's current statusSummary and sends it to admins for review.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = InterestAreaAlertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "interest_area_id (positive integer) is required" },
      { status: 400 },
    );
  }

  try {
    const alert = await createInterestAreaAlert(parsed.data.interest_area_id);
    const sendResult = await sendAlertToAdmins(alert.id);
    return NextResponse.json({
      ok: true,
      alertId: alert.id,
      ...sendResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
