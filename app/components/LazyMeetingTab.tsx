"use client";

import { useEffect, useState } from "react";
import SegmentsPanel from "./SegmentsPanel";
import SpeakerSummariesPanel from "./SpeakerSummariesPanel";
import type { MeetingTabs } from "@/app/lib/meetingRecord";
import type { OffsetModel } from "@/app/lib/offset";

/**
 * A meeting-page tab whose content loads when the tab is opened
 * (FIX-MEETING-TABS-LAZY-001). TabbedPanel mounts only the active tab, so
 * mounting is the click. All lazy tabs on a page share one fetch of
 * /meeting-tabs/<slug>, one metered ISR read.
 */
const tabsRequests = new Map<string, Promise<MeetingTabs>>();

function fetchTabs(url: string): Promise<MeetingTabs> {
  let request = tabsRequests.get(url);
  if (!request) {
    request = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<MeetingTabs>;
    });
    // A failed request is forgotten so the next open retries.
    request.catch(() => tabsRequests.delete(url));
    tabsRequests.set(url, request);
  }
  return request;
}

type Kind = "minutes" | "agenda" | "speakers";

export default function LazyMeetingTab({
  url,
  kind,
  minutesUrl = null,
  offsetModel = null,
}: {
  url: string;
  kind: Kind;
  minutesUrl?: string | null;
  offsetModel?: OffsetModel | null;
}) {
  const [tabs, setTabs] = useState<MeetingTabs | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetchTabs(url).then(
      (data) => live && setTabs(data),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [url, attempt]);

  if (failed) {
    return (
      <p className="text-gray-500 dark:text-gray-400" role="status">
        This tab didn&rsquo;t load.{" "}
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </p>
    );
  }
  if (!tabs) {
    return (
      <p className="text-gray-500 dark:text-gray-400" role="status">
        Loading…
      </p>
    );
  }

  if (kind === "agenda") {
    return <SegmentsPanel segments={tabs.segments} offsetModel={offsetModel} />;
  }
  if (kind === "speakers") {
    return <SpeakerSummariesPanel speakers={tabs.speakerSummaries} titleByUuid={tabs.titleByUuid} />;
  }
  return tabs.minutesText ? (
    <div>
      <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-96 overflow-y-auto">
        {tabs.minutesText}
      </div>
      {minutesUrl && (
        <a
          href={minutesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View full minutes ↗
        </a>
      )}
    </div>
  ) : (
    <p className="text-gray-500 dark:text-gray-400">No minutes are available for this meeting yet.</p>
  );
}
