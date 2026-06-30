import { handlePublishRequest } from "@/app/lib/publish";

/**
 * POST /api/publish
 *
 * Body: { "meeting_id": <number> }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Notifies active subscribers to the meeting's city (CITY_UPDATES) that a
 * meeting has been added, with a TL;DR, Key Decisions, and a link to the
 * Counciloris page. Same content as /api/publish-to-admins but without the
 * "(ADMIN)" subject tag, and each email includes a manage/unsubscribe link.
 */
export async function POST(req: Request) {
  return handlePublishRequest(req, "city");
}
