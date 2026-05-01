export const TOPIC = {
  title: "Bruggemeyer Library Project",
  blurb:
    "Authorization of a Professional Services agreement with BOA Architecture for plans, specifications and engineer's estimates. Discussion has spanned bike-lane planning, parking impact, and library facility upgrades.",
  status: "Awaiting next reading · Apr 2026",
  firstSeen: "Jun 4, 2024",
  lastSeen: "Apr 15, 2026",
  meetingsCount: 7,
  speakersCount: 9,
  documentsCount: 4,
  publicCommentsCount: 12,
  tags: ["Infrastructure", "Library", "Bike Lanes", "District 3"],
};

export interface Meeting {
  id: string;
  date: string;
  short: string;
  title: string;
  summary: string;
  timestamps: string[];
  speakers: string[];
  tag: string;
  decision?: boolean;
  pending?: boolean;
}

export const MEETINGS: Meeting[] = [
  {
    id: "m1",
    date: "Jun 4, 2024",
    short: "Jun 4 '24",
    title: "Council · Regular Meeting",
    summary:
      "Initial mention as part of CIP scoping. Staff flagged that library improvements would return for a future reading.",
    timestamps: ["12:04", "47:21"],
    speakers: ["J. Sanchez", "Staff"],
    tag: "First mention",
  },
  {
    id: "m2",
    date: "Sep 17, 2024",
    short: "Sep 17 '24",
    title: "Council · Special Session",
    summary:
      "Bike-lane connectivity discussion overlapped with library frontage planning. Concerns raised re: parking loss.",
    timestamps: ["1:54", "23:11", "58:02"],
    speakers: ["E. Yang", "T. Wong", "S. Igoe"],
    tag: "Discussion",
  },
  {
    id: "m3",
    date: "Jan 21, 2025",
    short: "Jan 21 '25",
    title: "Council · Regular Meeting",
    summary:
      "Staff returned with cost study. Item continued; no vote taken.",
    timestamps: [],
    speakers: ["H. Lo", "Staff"],
    tag: "Continued",
  },
  {
    id: "m4",
    date: "Jun 10, 2025",
    short: "Jun 10 '25",
    title: "Council · Regular Meeting",
    summary:
      "Public comment period included six speakers in support, two opposed. Item not on agenda.",
    timestamps: ["1:12:08"],
    speakers: ["Public"],
    tag: "Public comment",
  },
  {
    id: "m5",
    date: "Dec 17, 2025",
    short: "Dec 17 '25",
    title: "Council · Regular Meeting",
    summary:
      "Approved authorization for the City Manager to execute a Professional Services agreement with BOA Architecture (≤ $89,000). Motion 5–0.",
    timestamps: ["32:18", "44:02"],
    speakers: ["H. Lo", "V. Ngo", "J. Sanchez", "T. Wong", "E. Yang"],
    tag: "Vote · 5–0",
    decision: true,
  },
  {
    id: "m6",
    date: "Feb 18, 2026",
    short: "Feb 18 '26",
    title: "Council · Regular Meeting",
    summary:
      "Status update from BOA. Schematic milestones acknowledged. No action.",
    timestamps: ["18:44"],
    speakers: ["Staff", "BOA Arch."],
    tag: "Update",
  },
  {
    id: "m7",
    date: "Apr 15, 2026",
    short: "Apr 15 '26",
    title: "Council · Regular Meeting",
    summary:
      "Council requested community-outreach plan before next reading. To return in May.",
    timestamps: ["55:30"],
    speakers: ["E. Yang", "J. Sanchez"],
    tag: "Pending",
    pending: true,
  },
];

export interface Speaker {
  name: string;
  role: string;
  stance: "support" | "concern" | "neutral" | "mixed";
  mentions: number;
  init: string;
}

export const SPEAKERS: Speaker[] = [
  { name: "Jose Sanchez",   role: "Council",    stance: "support",  mentions: 14, init: "JS" },
  { name: "Henry Lo",       role: "Council",    stance: "support",  mentions: 11, init: "HL" },
  { name: "Elizabeth Yang", role: "Mayor",      stance: "concern",  mentions: 9,  init: "EY" },
  { name: "Thomas Wong",    role: "Council",    stance: "concern",  mentions: 8,  init: "TW" },
  { name: "Vinh Ngo",       role: "Council",    stance: "neutral",  mentions: 4,  init: "VN" },
  { name: "Shawn Igoe",     role: "Staff · PW", stance: "neutral",  mentions: 7,  init: "SI" },
  { name: "BOA Architecture", role: "Vendor",   stance: "neutral",  mentions: 3,  init: "BA" },
  { name: "Public (8)",     role: "Comment",    stance: "mixed",    mentions: 12, init: "PC" },
];

export const RELATED = [
  "Atlantic Blvd. Bike Lanes",
  "FY26 Capital Improvement Plan",
  "Parking on Garvey Ave.",
  "BOA Architecture (vendor)",
];

export const NEXT_STEPS = [
  { when: "May 2026", what: "Community-outreach plan due back to Council" },
  { when: "Q3 2026",  what: "30% schematics milestone (BOA)" },
  { when: "TBD",      what: "Construction authorization (separate reading)" },
];
