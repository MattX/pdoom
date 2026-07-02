import type { User, Estimate, DistPoint } from "./types";

// Predictions from public figures who aren't site users. They're rendered
// exactly like user estimates — merged into the users/estimates lists so they
// flow through every component — but carry an `external` flag (which keeps them
// out of aggregate stats like medians/averages) and a `source` link for
// attribution. To add another prediction, append to PREDICTIONS below.
interface ExternalPrediction {
  slug: string;
  name: string;
  picture?: string | null;
  /** URL of the original prediction. */
  source: string;
  /** ISO date the prediction was published. */
  date: string;
  /** Cumulative P(AGI by year) anchors, same shape as a user's agi_curve. */
  agiCurve?: DistPoint[];
  pdoomGivenAgi?: number;
  note?: string;
}

const PREDICTIONS: ExternalPrediction[] = [
  {
    slug: "scott-alexander",
    name: "Scott Alexander",
    source: "https://www.astralcodexten.com/p/my-ai-opinions",
    date: "2026-06-16",
    // "25% chance of AGI by 2027, 50% by 2034, 75% by 2045", where AGI is
    // defined as AI intelligent enough to do 90% of knowledge work jobs.
    agiCurve: [
      { year: 2027, p: 0.25 },
      { year: 2034, p: 0.5 },
      { year: 2045, p: 0.75 },
    ],
    // "20% chance that the first AIs to cross the point of no return will want
    // to eliminate the human population."
    pdoomGivenAgi: 0.2,
    note: "AGI = AI able to do 90% of knowledge work jobs. 20% chance the first AIs past the point of no return want to eliminate humanity.",
  },
];

const id = (slug: string) => `external:${slug}`;

export const EXTERNAL_USERS: User[] = PREDICTIONS.map((p) => ({
  id: id(p.slug),
  name: p.name,
  picture: p.picture ?? null,
  external: true,
  source: p.source,
}));

export const EXTERNAL_ESTIMATES: Estimate[] = PREDICTIONS.map((p, i) => ({
  // Negative ids never collide with the DB's autoincrement (positive) ids.
  id: -(i + 1),
  user_id: id(p.slug),
  user_name: p.name,
  user_picture: p.picture ?? null,
  agi_curve: p.agiCurve ?? null,
  pdoom_given_agi: p.pdoomGivenAgi ?? null,
  note: p.note ?? null,
  created_at: Math.floor(new Date(p.date).getTime() / 1000),
  external: true,
  source: p.source,
}));
