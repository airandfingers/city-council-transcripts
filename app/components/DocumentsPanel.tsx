import TabbedPanel from "./TabbedPanel";

type DocumentItem = {
  id: number;
  title: string;
  url: string;
  documentType: string | null;
  associatedAgendaItem: string | null;
};

export default function DocumentsPanel({
  minutesText,
  minutesUrl,
  documents,
  extraTabs,
}: {
  minutesText: string | null;
  minutesUrl: string | null;
  documents: DocumentItem[];
  extraTabs?: { label: string; content: React.ReactNode }[];
}) {
  const tabs: { label: string; content: React.ReactNode }[] = [];

  tabs.push({
    label: "Minutes",
    content: minutesText ? (
      <div>
        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-96 overflow-y-auto">
          {minutesText}
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

  tabs.push({
    label: "Documents",
    content:
      documents.length > 0 ? (
        <ul className="space-y-3">
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

  if (extraTabs) {
    tabs.push(...extraTabs);
  }

  return <TabbedPanel tabs={tabs} />;
}
