"use client";

import { useState } from "react";

type Topic = {
  label: string;
  bullets: string[];
};

const topics: Topic[] = [
  {
    label: "Data Center Proposal",
    bullets: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.",
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
    ],
  },
  {
    label: "Pool Revitalization",
    bullets: [
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur.",
      "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.",
      "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
      "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.",
    ],
  },
  {
    label: "Other Business",
    bullets: [
      "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime.",
      "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.",
      "Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias.",
      "Et harum quidem rerum facilis est et expedita distinctio, nam libero tempore cum soluta nobis.",
      "Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
      "Inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem.",
    ],
  },
];

export default function TopicsPanel() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Topics Discussed</h2>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
        {topics.map((topic, index) => (
          <button
            key={topic.label}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === index
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {topic.label}
          </button>
        ))}
      </div>
      {/* All panels rendered in the same grid cell so the tallest
          one determines the container height, preventing layout shift. */}
      <div className="grid">
        {topics.map((topic, index) => (
          <ul
            key={topic.label}
            className={`col-start-1 row-start-1 list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 transition-opacity ${
              activeTab === index
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={activeTab !== index}
          >
            {topic.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
