"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { updateMeetingTitle } from "@/app/actions/updateMeetingTitle";

export default function EditableTitle({
  meetingId,
  initialTitle,
}: {
  meetingId: number;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setDraft(title);
    setEditing(true);
    // Focus after React renders the input
    setTimeout(() => inputRef.current?.select(), 0);
  }, [title]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateMeetingTitle(meetingId, trimmed);
        setTitle(result.title);
      } catch {
        // revert on failure
        setDraft(title);
      }
      setEditing(false);
    });
  }, [draft, title, meetingId]);

  const cancel = useCallback(() => {
    setDraft(title);
    setEditing(false);
  }, [title]);

  if (editing) {
    return (
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={isPending}
          className="text-3xl font-bold font-display bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={save}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <h1
      onClick={startEditing}
      title="Update meeting title"
      className="text-3xl font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {title}
    </h1>
  );
}
