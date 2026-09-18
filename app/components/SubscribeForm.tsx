"use client";

import { useState, useTransition } from "react";
import { subscribe, type SubscribeInputType } from "@/app/actions/subscribe";

type SubscribeFormCommon = {
  ctaLabel?: string;
  className?: string;
  compact?: boolean;
  /** Drop the card chrome (border/background/padding) so the form can be
   *  embedded inside another container. */
  bare?: boolean;
  /** Suppress the form's own prompt line. For callers whose surrounding
   *  card already says what subscribing does — without this the topic page
   *  said it three times over (heading, blurb, prompt). */
  hidePrompt?: boolean;
};

export type SubscribeFormProps = SubscribeFormCommon &
  (
    | { kind: "SITE_UPDATES" }
    | { kind: "CITY_COVERAGE_REQUEST" }
    | { kind: "CITY_UPDATES"; cityId: number; cityName: string }
    | {
        kind: "TOPIC_IN_CITY_UPDATES";
        cityId: number;
        interestAreaId: number;
        topicName: string;
      }
    | { kind: "TOPIC_IN_CITY_COVERAGE_REQUEST"; cityId: number }
  );

type Status = "idle" | "submitting" | "success" | "error";
type Frequency = "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Sign-up cadences, as a segmented control rather than a `<select>`: three
 * options are worth showing at once, and the choice is part of deciding to
 * subscribe, not a setting to go hunting for.
 *
 * DAILY is deliberately absent here while staying a valid AlertFrequency —
 * the backend still delivers it and /subscriptions still offers it, so
 * existing daily subscribers keep working; it's just not one of the
 * choices we put in front of someone signing up.
 */
const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "INSTANT", label: "Instant updates" },
  { value: "WEEKLY", label: "Weekly digest" },
  { value: "MONTHLY", label: "Monthly digest" },
];

function defaultCta(kind: SubscribeFormProps["kind"]): string {
  switch (kind) {
    case "CITY_COVERAGE_REQUEST":
    case "TOPIC_IN_CITY_COVERAGE_REQUEST":
      return "Request";
    default:
      return "Subscribe";
  }
}

function defaultPrompt(props: SubscribeFormProps): string {
  switch (props.kind) {
    case "SITE_UPDATES":
      return "Get Counciloris updates by email.";
    case "CITY_UPDATES":
      return `Get updates about ${props.cityName}.`;
    case "TOPIC_IN_CITY_UPDATES":
      return `Get updates about "${props.topicName}".`;
    case "CITY_COVERAGE_REQUEST":
      return "";
    case "TOPIC_IN_CITY_COVERAGE_REQUEST":
      return "";
  }
}

export default function SubscribeForm(props: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [requestedCityName, setRequestedCityName] = useState("");
  const [requestedTopicName, setRequestedTopicName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("INSTANT");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const cta = props.ctaLabel ?? defaultCta(props.kind);
  const prompt = props.hidePrompt ? "" : defaultPrompt(props);
  const showCityName = props.kind === "CITY_COVERAGE_REQUEST";
  const showTopicName = props.kind === "TOPIC_IN_CITY_COVERAGE_REQUEST";
  const showFrequency = props.kind === "CITY_UPDATES" || props.kind === "TOPIC_IN_CITY_UPDATES";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatus("submitting");

    const input: SubscribeInputType = (() => {
      switch (props.kind) {
        case "SITE_UPDATES":
          return { kind: "SITE_UPDATES", email, honeypot };
        case "CITY_COVERAGE_REQUEST":
          return {
            kind: "CITY_COVERAGE_REQUEST",
            email,
            requestedCityName,
            honeypot,
          };
        case "CITY_UPDATES":
          return {
            kind: "CITY_UPDATES",
            email,
            cityId: props.cityId,
            frequency,
            honeypot,
          };
        case "TOPIC_IN_CITY_UPDATES":
          return {
            kind: "TOPIC_IN_CITY_UPDATES",
            email,
            cityId: props.cityId,
            interestAreaId: props.interestAreaId,
            frequency,
            honeypot,
          };
        case "TOPIC_IN_CITY_COVERAGE_REQUEST":
          return {
            kind: "TOPIC_IN_CITY_COVERAGE_REQUEST",
            email,
            cityId: props.cityId,
            requestedTopicName,
            honeypot,
          };
      }
    })();

    startTransition(async () => {
      const result = await subscribe(input);
      if (result.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.error);
      }
    });
  };

  const baseClasses = props.bare
    ? ""
    : "rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900";
  const className = `${baseClasses} ${props.className ?? ""}`.trim();

  if (status === "success") {
    return (
      <div className={className}>
        <p className="text-sm text-green-700 dark:text-green-400">
          Check your email to confirm your subscription.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {prompt && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {prompt}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {showCityName && (
          <input
            type="text"
            required
            placeholder="City name"
            value={requestedCityName}
            onChange={(e) => setRequestedCityName(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
            disabled={isPending}
            maxLength={200}
          />
        )}

        {showTopicName && (
          <input
            type="text"
            required
            placeholder="Topic name"
            value={requestedTopicName}
            onChange={(e) => setRequestedTopicName(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
            disabled={isPending}
            maxLength={200}
          />
        )}

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

        {showFrequency && (
          <fieldset disabled={isPending} className="min-w-0">
            <legend className="sr-only">How often would you like to be emailed?</legend>
            <div className="flex rounded border border-gray-300 dark:border-gray-700 overflow-hidden">
              {FREQUENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 cursor-pointer text-center text-xs px-2 py-1.5 border-r last:border-r-0 border-gray-300 dark:border-gray-700 transition-colors ${
                    frequency === opt.value
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    checked={frequency === opt.value}
                    onChange={() => setFrequency(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

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
          {isPending ? "Submitting…" : cta}
        </button>
      </div>

      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
