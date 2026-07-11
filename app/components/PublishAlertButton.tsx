"use client";

import { useState, useTransition } from "react";
import { cancelAlert, publishAlert } from "@/app/actions/publishAlert";

export default function PublishAlertButton({ alertId }: { alertId: number }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const send = () => {
    startTransition(async () => {
      try {
        const { sent, failed, skipped, skippedReason } = await publishAlert(alertId);
        if (skipped) {
          setResult(`Skipped — ${skippedReason ?? "not sent to subscribers"}.`);
        } else {
          setResult(`Sent to ${sent} subscriber(s)${failed.length ? `, ${failed.length} failed` : ""}.`);
        }
      } catch {
        setResult("Failed to send.");
      }
    });
  };

  const hold = () => {
    startTransition(async () => {
      try {
        await cancelAlert(alertId);
        setResult("Canceled — this alert will not auto-send.");
      } catch {
        setResult("Failed to cancel.");
      }
    });
  };

  return (
    <div>
      <button onClick={send} disabled={isPending}>
        {isPending ? "Working..." : "Send now"}
      </button>
      <button onClick={hold} disabled={isPending} style={{ marginLeft: "0.5rem" }}>
        Hold / Cancel
      </button>
      {result && <p>{result}</p>}
    </div>
  );
}
