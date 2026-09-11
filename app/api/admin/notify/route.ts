import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized, getAdminRecipients } from "@/app/lib/publish";
import { sendAdminAlertEmail } from "@/app/lib/email";

/**
 * POST /api/admin/notify
 *
 * Body: { "subject": string, "body": string, "severity"?: "error" | "warn" }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Generic pipeline-error alert (FIX-SUMMARY-PARSE-FAILURE-001). Unlike
 * /api/publish-to-admins (which drafts an Alert row for the once-daily
 * admin digest, tied to one meeting), this sends an instant email — a
 * pipeline failure needs a human to see it now, not in tomorrow's digest.
 * Not meeting-scoped: the transcriber's src/admin_notify.py::notify_admins()
 * is the intended caller for any condition worth a human's attention (a
 * poisoned summary, a publish-validation abort, an LM Studio outage, a
 * Neon quota pause) — see that module's docstring for the full list.
 */
const NotifyBody = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  severity: z.enum(["error", "warn"]).optional(),
});

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = NotifyBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "subject (string) and body (string) are required" },
      { status: 400 },
    );
  }

  const admins = await getAdminRecipients();
  const adminEmails = admins.map((a) => a.email);

  await sendAdminAlertEmail({
    subject: parsed.data.subject,
    body: parsed.data.body,
    severity: parsed.data.severity,
    adminEmails,
  });

  return NextResponse.json({ ok: true, recipientCount: adminEmails.length });
}
