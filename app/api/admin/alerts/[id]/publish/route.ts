import { NextResponse } from "next/server";
import { z } from "zod";
import { publishAlertToSubscribers } from "@/app/lib/alerts";
import { isAuthorized } from "@/app/lib/publish";

const PublishAlertBody = z.object({
  triggered_by: z.string().email().optional(),
});

/**
 * POST /api/admin/alerts/[id]/publish
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "triggered_by"?: "<email>" }
 *
 * Publishes a DRAFTED or SENT_TO_ADMINS alert to its end-user subscribers.
 * This is the manual "send to subscribers" trigger, callable from the Flask
 * operator dashboard in addition to the existing PublishAlertButton UI.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid alert id" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const parsed = PublishAlertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await publishAlertToSubscribers(id, parsed.data.triggered_by);
    return NextResponse.json({ ok: true, alertId: id, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
