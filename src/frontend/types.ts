import type { DistPoint } from "../shared/distribution";
export type { DistPoint };

export interface User {
  id: string;
  name: string;
  picture: string | null;
  email?: string;
  // Cited third-party predictions (not site users). Excluded from aggregate
  // stats (medians, averages); `source` links to the original.
  external?: boolean;
  source?: string | null;
}

export interface Estimate {
  id: number;
  user_id: string;
  user_name: string;
  user_picture: string | null;
  agi_curve: DistPoint[] | null;
  pdoom_given_agi: number | null;
  note: string | null;
  created_at: number;
  // Mirrors User.external/source for the denormalized log view.
  external?: boolean;
  source?: string | null;
}

// Scalar questions shown as separate inputs / columns (AGI timeline uses the distribution editor)
export const QUESTIONS = [
  { key: "pdoom_given_agi" as const, label: "P(doom | AGI)", short: "doom" },
] as const;

export type QuestionKey = (typeof QUESTIONS)[number]["key"];

export const QUESTION_COLORS: Record<QuestionKey, string> = {
  pdoom_given_agi: "#ef4444",
};

// Reference years used when summarising a curve with single numbers
export const CURVE_REF_YEARS = [2030, 2040, 2050] as const;
