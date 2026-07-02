import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import type { Env, EstimateRowWithUser, EstimateWithUser } from "./types";
import { normalize, probAt, MIN_YEAR, MAX_YEAR, type DistPoint } from "../shared/distribution";
import { authRouter } from "./auth";
import { verifyJWT } from "./jwt";

const CURVE_REF_YEARS = [2030, 2040, 2050] as const;

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function deltaStr(cur: number, prev: number): string {
  const d = (cur - prev) * 100;
  return d >= 0 ? `+${d.toFixed(1)}pp` : `${d.toFixed(1)}pp`;
}

async function notifyDiscord(
  webhookUrl: string,
  estimate: EstimateWithUser,
  prev: EstimateWithUser | null,
  appUrl: string,
): Promise<void> {
  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (estimate.agi_curve && estimate.agi_curve.length > 0) {
    for (const y of CURVE_REF_YEARS) {
      const cur = probAt(estimate.agi_curve, y);
      const prevVal =
        prev?.agi_curve && prev.agi_curve.length > 0 ? probAt(prev.agi_curve, y) : null;
      const value =
        prevVal !== null ? `${pct(cur)} (${deltaStr(cur, prevVal)})` : pct(cur);
      fields.push({ name: `AGI by ${y}`, value, inline: true });
    }
  }

  if (estimate.pdoom_given_agi !== null) {
    const cur = estimate.pdoom_given_agi;
    const prevVal = prev?.pdoom_given_agi ?? null;
    const value =
      prevVal !== null ? `${pct(cur)} (${deltaStr(cur, prevVal)})` : pct(cur);
    fields.push({ name: "P(doom | AGI)", value, inline: true });
  }

  const embed: Record<string, unknown> = {
    author: {
      name: estimate.user_name,
      ...(estimate.user_picture ? { icon_url: estimate.user_picture } : {}),
    },
    color: 0xef4444,
    fields,
    url: appUrl,
    timestamp: new Date(estimate.created_at * 1000).toISOString(),
  };

  if (estimate.note) {
    embed.description = `*"${estimate.note}"*`;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors({ origin: "*", credentials: true }));

// Auth routes
app.route("/auth", authRouter);

// Session middleware helper
async function requireAuth(c: { req: { raw: Request }; env: Env; json: Function }) {
  const token = getCookie({ req: { raw: c.req.raw } } as any, "session");
  if (!token) return null;
  return verifyJWT(token, c.env.JWT_SECRET);
}

// GET /api/me
app.get("/api/me", async (c) => {
  const session = await requireAuth(c);
  if (!session) return c.json({ user: null });

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.sub).first();
  return c.json({ user });
});

// GET /api/users
app.get("/api/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, picture FROM users ORDER BY created_at ASC"
  ).all();
  return c.json({ users: results });
});

// GET /api/estimates
app.get("/api/estimates", async (c) => {
  const userId = c.req.query("userId");

  let query = `
    SELECT e.*, u.name as user_name, u.picture as user_picture
    FROM estimates e
    JOIN users u ON e.user_id = u.id
  `;
  const bindings: string[] = [];

  if (userId) {
    query += " WHERE e.user_id = ?";
    bindings.push(userId);
  }

  query += " ORDER BY e.created_at DESC LIMIT 500";

  const stmt = bindings.length
    ? c.env.DB.prepare(query).bind(...bindings)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all<EstimateRowWithUser>();
  const estimates: EstimateWithUser[] = results.map((row) => ({
    ...row,
    agi_curve: row.agi_curve ? (JSON.parse(row.agi_curve) as DistPoint[]) : null,
  }));
  return c.json({ estimates });
});

// POST /api/estimates
app.post("/api/estimates", async (c) => {
  const session = await requireAuth(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{
    agi_curve?: DistPoint[];
    pdoom_given_agi?: number;
    note?: string;
  }>();

  // Validate agi_curve
  let normalizedCurve: DistPoint[] | null = null;
  if (body.agi_curve !== undefined && body.agi_curve !== null) {
    const curve = body.agi_curve;
    if (!Array.isArray(curve) || curve.length === 0 || curve.length > 20) {
      return c.json({ error: "agi_curve must be an array of 1–20 points" }, 400);
    }
    for (const pt of curve) {
      if (
        typeof pt !== "object" ||
        !Number.isInteger(pt.year) ||
        pt.year < MIN_YEAR ||
        pt.year > MAX_YEAR ||
        typeof pt.p !== "number" ||
        pt.p < 0 ||
        pt.p > 1
      ) {
        return c.json(
          { error: `Each agi_curve point must have integer year (${MIN_YEAR}–${MAX_YEAR}) and p in [0,1]` },
          400
        );
      }
    }
    normalizedCurve = normalize(curve);
  }

  // Validate pdoom_given_agi
  if (body.pdoom_given_agi !== undefined && body.pdoom_given_agi !== null) {
    if (typeof body.pdoom_given_agi !== "number" || body.pdoom_given_agi < 0 || body.pdoom_given_agi > 1) {
      return c.json({ error: "pdoom_given_agi must be a number between 0 and 1" }, 400);
    }
  }

  const hasAny =
    (normalizedCurve !== null) ||
    (body.pdoom_given_agi !== undefined && body.pdoom_given_agi !== null);
  if (!hasAny) return c.json({ error: "At least one estimate is required" }, 400);

  // Fetch previous estimate before inserting (for delta in Discord notification)
  const prevRow = c.env.DISCORD_WEBHOOK_URL
    ? await c.env.DB.prepare(
        `SELECT e.*, u.name as user_name, u.picture as user_picture
         FROM estimates e JOIN users u ON e.user_id = u.id
         WHERE e.user_id = ? ORDER BY e.created_at DESC LIMIT 1`
      )
        .bind(session.sub)
        .first<EstimateRowWithUser>()
    : null;

  const result = await c.env.DB.prepare(
    `INSERT INTO estimates (user_id, agi_curve, pdoom_given_agi, note)
     VALUES (?, ?, ?, ?)`
  )
    .bind(
      session.sub,
      normalizedCurve !== null ? JSON.stringify(normalizedCurve) : null,
      body.pdoom_given_agi ?? null,
      body.note ?? null
    )
    .run();

  if (c.env.DISCORD_WEBHOOK_URL) {
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(session.sub)
      .first<{ name: string; picture: string | null }>();

    const newEstimate: EstimateWithUser = {
      id: result.meta.last_row_id as number,
      user_id: session.sub,
      user_name: user?.name ?? session.name,
      user_picture: user?.picture ?? session.picture,
      agi_curve: normalizedCurve,
      pdoom_given_agi: body.pdoom_given_agi ?? null,
      note: body.note ?? null,
      created_at: Math.floor(Date.now() / 1000),
    };

    const prevEstimate: EstimateWithUser | null = prevRow
      ? { ...prevRow, agi_curve: prevRow.agi_curve ? JSON.parse(prevRow.agi_curve) : null }
      : null;

    // Fire-and-forget; don't let Discord failures affect the response
    c.executionCtx.waitUntil(
      notifyDiscord(c.env.DISCORD_WEBHOOK_URL, newEstimate, prevEstimate, c.env.APP_URL).catch(
        () => {}
      )
    );
  }

  return c.json({ id: result.meta.last_row_id }, 201);
});

// GET /api/metaculus — proxy Metaculus question 5121
app.get("/api/metaculus", async (c) => {
  const res = await fetch("https://www.metaculus.com/api2/questions/5121/", {
    headers: { Accept: "application/json", Authorization: c.env.METACULUS_API_KEY },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });

  if (!res.ok) return c.json({ error: "Metaculus unavailable" }, 502);

  const data = await res.json();
  return c.json(data);
});

// Serve static assets for everything else
app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
