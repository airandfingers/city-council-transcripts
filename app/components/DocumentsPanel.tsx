import type { ReactNode } from "react";
import TabbedPanel, { type Tab } from "./TabbedPanel";

type DocumentItem = {
  id: number;
  title: string;
  url: string;
  documentType: string | null;
  associatedAgendaItem: string | null;
};

/** `minutes` is the Minutes tab's content when the meeting has minutes text,
 * else null. The page passes a LazyMeetingTab, so the text loads only when
 * the tab is opened (FIX-MEETING-TABS-LAZY-001). */
export default function DocumentsPanel({
  minutes,
  minutesUrl,
  documents,
  sourceUrl,
  extraTabs,
}: {
  minutes: ReactNode | null;
  minutesUrl: string | null;
  documents: DocumentItem[];
  sourceUrl?: string | null;
  extraTabs?: Tab[];
}) {
  const tabs: Tab[] = [];

  tabs.push({
    label: "Documents",
    content:
      documents.length > 0 || sourceUrl ? (
        <ul className="space-y-3">
          {sourceUrl && (
            <li>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Meeting source page ↗
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {sourceUrl}
              </p>
            </li>
          )}
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {doc.title} ↗
              </a>
              {doc.documentType && (
                <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {doc.documentType}
                </span>
              )}
              {doc.associatedAgendaItem && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {doc.associatedAgendaItem}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          No documents are available for this meeting yet.
        </p>
      ),
  });

  tabs.push({
    label: "Minutes",
    content: minutes ? (
      minutes
    ) : (
      <p className="text-gray-500 dark:text-gray-400">
        No minutes are available for this meeting yet.
        {minutesUrl && (
          <>
            {" "}
            <a
              href={minutesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View minutes source ↗
            </a>
          </>
        )}
      </p>
    ),
  });

  if (extraTabs) {
    tabs.push(...extraTabs);
  }

  return (
    <TabbedPanel
      tabs={tabs}
      className="h-full min-h-0 flex flex-col"
      contentClassName="flex-1 min-h-0"
      panelClassName="h-full min-h-0 overflow-y-auto pr-1"
    />
  );
}
