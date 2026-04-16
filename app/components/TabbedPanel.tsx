"use client";

import { type ReactNode, useState } from "react";

export type Tab = {
  label: string;
  content: ReactNode;
};

export default function TabbedPanel({
  tabs,
  heading,
}: {
  tabs: Tab[];
  heading?: string;
}) {
  const [activeTab, setActiveTab] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div>
      {heading && (
        <h2 className="text-2xl font-semibold mb-4">{heading}</h2>
      )}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === index
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* All panels rendered in the same grid cell so the tallest
          one determines the container height, preventing layout shift. */}
      <div className="grid">
        {tabs.map((tab, index) => (
          <div
            key={tab.label}
            className={`col-start-1 row-start-1 transition-opacity ${
              activeTab === index
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={activeTab !== index}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
