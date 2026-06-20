"use client";

import { useState, useTransition } from "react";
import { requestManageLink } from "@/app/actions/requestManageLink";

type Status = "idle" | "submitting" | "success" | "error";

export default function RequestManageLinkForm() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatus("submitting");

    startTransition(async () => {
      const result = await requestManageLink({ email, honeypot });
      if (result.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.error);
      }
    });
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        <p className="text-sm text-green-700 dark:text-green-400">
          If we have a record of that email, we&apos;ve sent a management link.
          Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900"
      noValidate
    >
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
        Lost your link? Enter your email and we&apos;ll send you a new one.
      </p>
      <div className="flex flex-col gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
          disabled={isPending}
          maxLength={320}
        />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: "absolute", left: "-9999px", height: 0, width: 0 }}
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 font-medium"
        >
          {isPending ? "Sending…" : "Email me a link"}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
