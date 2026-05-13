export interface User {
  id: string;
  name: string;
  picture: string | null;
  email?: string;
}

export interface Estimate {
  id: number;
  user_id: string;
  user_name: string;
  user_picture: string | null;
  agi_2030: number | null;
  agi_2035: number | null;
  agi_2040: number | null;
  agi_2045: number | null;
  pdoom_given_agi: number | null;
  note: string | null;
  created_at: number;
}

export const QUESTIONS = [
  { key: "agi_2030" as const, label: "AGI by 2030", short: "2030" },
  { key: "agi_2035" as const, label: "AGI by 2035", short: "2035" },
  { key: "agi_2040" as const, label: "AGI by 2040", short: "2040" },
  { key: "agi_2045" as const, label: "AGI by 2045", short: "2045" },
  { key: "pdoom_given_agi" as const, label: "P(doom | AGI)", short: "doom" },
] as const;

export type QuestionKey = (typeof QUESTIONS)[number]["key"];

export const QUESTION_COLORS: Record<QuestionKey, string> = {
  agi_2030: "#f97316",
  agi_2035: "#eab308",
  agi_2040: "#22c55e",
  agi_2045: "#3b82f6",
  pdoom_given_agi: "#ef4444",
};
