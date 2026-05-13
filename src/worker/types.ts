export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: number;
}

export interface Estimate {
  id: number;
  user_id: string;
  agi_2030: number | null;
  agi_2035: number | null;
  agi_2040: number | null;
  agi_2045: number | null;
  pdoom_given_agi: number | null;
  note: string | null;
  created_at: number;
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
