import TimestampLink from "./TimestampLink";
import { BulletBody } from "./TopicsPanel";
import type { OutlineItem, OutlineRow } from "@/app/lib/outline";
import type { OffsetModel } from "@/app/lib/offset";

/**
 * The Timeline tab as a nested agenda outline (FEAT-MEETING-OUTLINE-001):
 * numbered agenda items, lettered sub-items, each timeline moment under the
 * item it belongs to, and a "＋" line for moments that didn't match any
 * agenda item. Server-rendered; built by app/lib/outline.ts.
 *
 * Items nothing was said about stay visible but quiet: a run of them
 * collapses to one dim line, and a heading's quiet sub-items fold into a
 * "N more" disclosure, so the outline fits the panel's height cap.
 */
export default function MeetingOutline({
  rows,
  offsetModel = null,
}: {
  rows: OutlineRow[];
  offsetModel?: OffsetModel | null;
}) {
  const hasExtras = rows.some((r) => r.kind === "extra");
  return (
    <div className="text-gray-700 dark:text-gray-300">
      <ol className="space-y-1.5">
        {groupQuiet(rows).map((g, i) =>
          g.kind === "quiet-run" ? (
            <QuietRun key={i} items={g.items} />
          ) : g.kind === "extra" ? (
            <li key={i} className="flex gap-2 items-baseline">
              <span
                className="w-10 shrink-0 text-right text-xs font-mono text-amber-600 dark:text-amber-400"
                title="Happened at the meeting, but not matched to an agenda item"
              >
                ＋<span className="sr-only">Not matched to an agenda item:</span>
              </span>
              <span className="flex-1">
                <BulletBody bullet={g.bullet} offsetModel={offsetModel} />
              </span>
            </li>
          ) : (
            <ItemRow key={i} item={g} offsetModel={offsetModel} />
          ),
        )}
      </ol>
      {hasExtras && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-amber-600 dark:text-amber-400">＋</span> happened at the meeting but
          isn&apos;t matched to an agenda item.
        </p>
      )}
    </div>
  );
}

type Group = OutlineRow | { kind: "quiet-run"; items: OutlineItem[] };

/** Fold runs of 2+ quiet top-level items ("1–5 Call to Order · Flag Salute…"). */
function groupQuiet(rows: OutlineRow[]): Group[] {
  const out: Group[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (r.kind === "item" && r.quiet) {
      if (last && last.kind === "quiet-run") last.items.push(r);
      else if (last && last.kind === "item" && last.quiet) out[out.length - 1] = { kind: "quiet-run", items: [last, r] };
      else out.push(r);
    } else {
      out.push(r);
    }
  }
  return out;
}

function ItemNumber({ value }: { value: string | null }) {
  return (
    <span className="w-10 shrink-0 text-right text-xs font-mono whitespace-nowrap text-gray-400 dark:text-gray-500">
      {value ?? ""}
    </span>
  );
}

function QuietRun({ items }: { items: OutlineItem[] }) {
  const first = items[0].itemNumber;
  const last = items[items.length - 1].itemNumber;
  return (
    <li className="flex gap-2 items-baseline text-sm text-gray-400 dark:text-gray-500">
      <ItemNumber value={first && last ? `${first}–${last}` : first} />
      <span className="flex-1">{items.map((i) => i.title).join(" · ")}</span>
    </li>
  );
}

function ItemRow({ item, offsetModel }: { item: OutlineItem; offsetModel: OffsetModel | null }) {
  const loud = item.children.filter((c) => !c.quiet);
  const quiet = item.children.filter((c) => c.quiet);
  return (
    <li>
      <div className={`flex gap-2 items-baseline ${item.quiet ? "text-sm text-gray-400 dark:text-gray-500" : ""}`}>
        <ItemNumber value={item.itemNumber} />
        <span className={`flex-1 ${item.quiet ? "" : "font-medium text-gray-900 dark:text-gray-100"}`}>
          {item.title}
        </span>
        {item.startSeconds != null && (
          <TimestampLink
            seconds={item.startSeconds}
            label={item.timecodeLabel ?? undefined}
            offsetModel={offsetModel}
            className="shrink-0 text-xs text-blue-500 dark:text-blue-400 hover:underline"
          />
        )}
      </div>
      {(item.outcome || item.bullets.length > 0 || item.children.length > 0) && (
        <div className="ml-12 mt-1 space-y-1">
          {item.outcome && (
            <p className="text-sm text-green-700 dark:text-green-400 line-clamp-2" title={item.outcome}>
              → {item.outcome}
            </p>
          )}
          {item.bullets.length > 0 && (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {item.bullets.map((b, i) => (
                <li key={i}>
                  <BulletBody bullet={b} offsetModel={offsetModel} />
                </li>
              ))}
            </ul>
          )}
          {loud.length > 0 && (
            <ol className="space-y-1.5 border-l border-gray-200 dark:border-gray-700 -ml-2 pl-0">
              {loud.map((c, i) => (
                <ItemRow key={i} item={c} offsetModel={offsetModel} />
              ))}
            </ol>
          )}
          {quiet.length > 0 && (
            <details className="text-sm text-gray-400 dark:text-gray-500">
              <summary className="cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300">
                {loud.length > 0 ? `${quiet.length} more` : `${quiet.length} item${quiet.length === 1 ? "" : "s"}`}
              </summary>
              <ol className="mt-1 space-y-0.5">
                {quiet.map((c, i) => (
                  <li key={i} className="flex gap-2 items-baseline">
                    <ItemNumber value={c.itemNumber} />
                    <span className="flex-1">{c.title}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </li>
  );
}
