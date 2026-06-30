import prisma from "@/app/lib/prisma";
import { AlertContent } from "@/app/lib/alerts";
import PublishAlertButton from "@/app/components/PublishAlertButton";

/**
 * MVP admin view: lists drafted/admin-reviewed alerts and lets an admin
 * manually trigger sending each one to its end-user subscribers (stage 2
 * of app/lib/alerts.ts). No auth gate yet — internal/unauthenticated by
 * design for this MVP slice; revisit once an admin auth system exists.
 */
export default async function AdminAlertsPage() {
  const alerts = await prisma.alert.findMany({
    where: { status: { in: ["DRAFTED", "SENT_TO_ADMINS"] } },
    orderBy: { createdAt: "desc" },
    include: { meeting: { select: { title: true, slug: true } } },
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Pending alerts</h1>
      {alerts.length === 0 && <p>No alerts awaiting review.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {alerts.map((alert) => {
          const content = alert.content as AlertContent;
          return (
            <li
              key={alert.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p>
                <strong>{content.subject}</strong> — {alert.type} ({alert.status})
              </p>
              {alert.meeting && <p>Meeting: {alert.meeting.title}</p>}
              {content.tldr && <p>{content.tldr}</p>}
              {content.keyDecisions.length > 0 && (
                <ul>
                  {content.keyDecisions.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              )}
              <PublishAlertButton alertId={alert.id} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
