import { handlePublishRequest } from "@/app/lib/publish";

/**
 * POST /api/publish-to-admins
 *
 * Body: { "meeting_id": <number> }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Notifies admin subscribers (Subscriber.isAdmin = true) that a meeting has
 * been added, with a TL;DR, Key Decisions, and a link to the Counciloris
 * page. Subject is tagged "(ADMIN)". Intended as a pre-publish review step.
 */
export async function POST(req: Request) {
  return handlePublishRequest(req, "admins");
}
