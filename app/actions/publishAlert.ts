"use server";

import { revalidatePath } from "next/cache";
import {
  cancelScheduledAlert,
  publishAlertToSubscribers,
} from "@/app/lib/alerts";

/**
 * Admin's manual trigger for stage 2 of the alert pipeline: sends the
 * reviewed alert content to the relevant end-user subscribers immediately
 * (overriding the scheduled hold window).
 */
export async function publishAlert(alertId: number, triggeredBy?: string) {
  const result = await publishAlertToSubscribers(alertId, triggeredBy);
  revalidatePath("/admin/alerts");
  return result;
}

/**
 * Admin's hold action: cancels an alert so the scheduled auto-send skips it.
 */
export async function cancelAlert(alertId: number, canceledBy?: string) {
  await cancelScheduledAlert(alertId, canceledBy);
  revalidatePath("/admin/alerts");
}
