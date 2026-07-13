type AgendaItem = {
  id: number;
  sourceItemId: string;
  itemNumber: string | null;
  title: string;
  description: string | null;
  documentUrls: unknown;
};

/**
 * Pre-meeting agenda view: renders the latest AgendaItemVersion per item,
 * scraped ahead of the meeting (before a transcript/segments exist). See
 * SegmentsPanel for the post-transcription equivalent with discussion
 * summaries and timestamps.
 */
export default function AgendaItemsPanel({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No agenda items available for this meeting yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const docs = Array.isArray(item.documentUrls)
          ? (item.documentUrls as { title?: string; url: string }[])
          : [];
        return (
          <div
            key={item.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-start gap-2">
              {item.itemNumber && (
                <span className="text-xs font-medium text-gray-400 shrink-0 mt-0.5">
                  {item.itemNumber}
                </span>
              )}
              <h3 className="font-medium text-sm">{item.title}</h3>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {item.description}
              </p>
            )}
            {docs.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {docs.map((doc, i) => (
                  <li key={i}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      {doc.title ?? doc.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
