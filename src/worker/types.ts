import type { DistPoint } from "../shared/distribution";
export type { DistPoint };

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
  METACULUS_API_KEY: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: number;
}

// Raw row shape returned by D1 (agi_curve stored as JSON text)
export interface EstimateRow {
  id: number;
  user_id: string;
  agi_curve: string | null;
  pdoom_given_agi: number | null;
  note: string | null;
  created_at: number;
}

// API-facing shape (agi_curve is parsed into an array)
export interface Estimate {
  id: number;
  user_id: string;
  agi_curve: DistPoint[] | null;
  pdoom_given_agi: number | null;
  note: string | null;
  created_at: number;
}

export interface EstimateRowWithUser extends EstimateRow {
  user_name: string;
  user_picture: string | null;
}

export interface EstimateWithUser extends Estimate {
  user_name: string;
  user_picture: string | null;
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  iat: number;
  exp: number;
}
