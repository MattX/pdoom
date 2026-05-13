import type { User, Estimate } from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  me: () => apiFetch<{ user: User | null }>("/api/me"),
  users: () => apiFetch<{ users: User[] }>("/api/users"),
  estimates: (userId?: string) =>
    apiFetch<{ estimates: Estimate[] }>(
      `/api/estimates${userId ? `?userId=${userId}` : ""}`
    ),
  postEstimate: (data: Partial<Record<string, number | string | null>>) =>
    apiFetch<{ id: number }>("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  metaculus: () => apiFetch<any>("/api/metaculus"),
};
