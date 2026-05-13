import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "./types";
import { signJWT, verifyJWT } from "./jwt";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.get("/google", (c) => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${c.env.APP_URL}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
  });

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: c.env.APP_URL.startsWith("https"),
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get("/google/callback", async (c) => {
  const { code, state, error } = c.req.query();

  if (error) return c.redirect("/?error=oauth_denied");

  const storedState = getCookie(c, "oauth_state");
  if (!storedState || storedState !== state) {
    return c.redirect("/?error=invalid_state");
  }

  deleteCookie(c, "oauth_state", { path: "/" });

  const redirectUri = `${c.env.APP_URL}/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return c.html(`<!doctype html><html><body style="font-family:monospace;padding:2rem;background:#111;color:#f87171">
      <h2>Token exchange failed (HTTP ${tokenRes.status})</h2>
      <h3>Google response:</h3>
      <pre style="white-space:pre-wrap;background:#1f2937;padding:1rem;border-radius:8px;color:#fcd34d">${escapeHtml(body)}</pre>
      <h3>Request details:</h3>
      <pre style="white-space:pre-wrap;background:#1f2937;padding:1rem;border-radius:8px;color:#93c5fd">client_id: ${escapeHtml(c.env.GOOGLE_CLIENT_ID || "(empty — check wrangler.toml)")}
redirect_uri: ${escapeHtml(redirectUri)}
client_secret set: ${c.env.GOOGLE_CLIENT_SECRET ? "yes (" + c.env.GOOGLE_CLIENT_SECRET.length + " chars)" : "NO — set via wrangler secret put GOOGLE_CLIENT_SECRET"}</pre>
      <p><a href="/" style="color:#60a5fa">← back</a></p>
    </body></html>`, tokenRes.status as any);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    const body = await userRes.text();
    return c.html(`<!doctype html><html><body style="font-family:monospace;padding:2rem;background:#111;color:#f87171">
      <h2>Userinfo failed (HTTP ${userRes.status})</h2>
      <pre style="white-space:pre-wrap;background:#1f2937;padding:1rem;border-radius:8px;color:#fcd34d">${escapeHtml(body)}</pre>
      <p><a href="/" style="color:#60a5fa">← back</a></p>
    </body></html>`, userRes.status as any);
  }

  const googleUser = (await userRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture`
  )
    .bind(googleUser.id, googleUser.email, googleUser.name, googleUser.picture)
    .run();

  const token = await signJWT(
    { sub: googleUser.id, email: googleUser.email, name: googleUser.name, picture: googleUser.picture },
    c.env.JWT_SECRET
  );

  setCookie(c, "session", token, {
    httpOnly: true,
    secure: c.env.APP_URL.startsWith("https"),
    sameSite: "Lax",
    maxAge: 7 * 24 * 3600,
    path: "/",
  });

  return c.redirect("/");
});

authRouter.post("/logout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

export async function getSession(c: { req: { raw: Request }; env: Env }) {
  const cookie = getCookie({ req: { raw: c.req.raw } } as Parameters<typeof getCookie>[0], "session");
  if (!cookie) return null;
  return verifyJWT(cookie, c.env.JWT_SECRET);
}
