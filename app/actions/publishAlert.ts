"use server";

import { revalidatePath } from "next/cache";
import { publishAlertToSubscribers } from "@/app/lib/alerts";

/**
 * Admin's manual trigger for stage 2 of the alert pipeline: sends the
 * reviewed alert content to the relevant end-user subscribers.
 */
export async function publishAlert(alertId: number, triggeredBy?: string) {
  const result = await publishAlertToSubscribers(alertId, triggeredBy);
  revalidatePath("/admin/alerts");
  return result;
}
