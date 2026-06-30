"use client";

import { useState, useTransition } from "react";
import { publishAlert } from "@/app/actions/publishAlert";

export default function PublishAlertButton({ alertId }: { alertId: number }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const trigger = () => {
    startTransition(async () => {
      try {
        const { sent, failed } = await publishAlert(alertId);
        setResult(`Sent to ${sent} subscriber(s)${failed.length ? `, ${failed.length} failed` : ""}.`);
      } catch {
        setResult("Failed to send.");
      }
    });
  };

  return (
    <div>
      <button onClick={trigger} disabled={isPending}>
        {isPending ? "Sending..." : "Send to subscribers"}
      </button>
      {result && <p>{result}</p>}
    </div>
  );
}
