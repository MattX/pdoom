import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Estimate, User } from "../types";
import { QUESTIONS, QUESTION_COLORS } from "../types";
import { probAt, anchorAtZero, MIN_YEAR } from "../../shared/distribution";

interface Props {
  estimates: Estimate[];
  users: User[];
  selectedUser: string | null;
}

// Chart only covers the near-term window — we don't have AGI today, so every
// line should read 0% at MIN_YEAR.
const CHART_END_YEAR = 2050;

const SAMPLE_YEARS: number[] = [];
for (let y = MIN_YEAR; y <= CHART_END_YEAR; y += 1) SAMPLE_YEARS.push(y);

// Palette for overlaid CDF lines (one per user)
const USER_COLORS = [
  "#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#fb7185",
  "#38bdf8", "#4ade80", "#fbbf24", "#c084fc", "#f472b6",
];

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function HistoryChart({ estimates, users, selectedUser }: Props) {
  // Latest estimate per user
  const latestByUser = new Map<string, Estimate>();
  for (const e of [...estimates].reverse()) {
    if (!latestByUser.has(e.user_id)) latestByUser.set(e.user_id, e);
  }

  const userMap = new Map(users.map((u) => [u.id, u]));

  const activeEstimates = [...latestByUser.values()].filter((e) =>
    selectedUser ? e.user_id === selectedUser : true
  );

  if (activeEstimates.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-gray-500 text-sm text-center">
        No estimates to display yet.
      </div>
    );
  }

  // Build CDF overlay data for AGI timeline
  const curveEstimates = activeEstimates.filter((e) => e.agi_curve && e.agi_curve.length > 0);
  const anchoredCurves = new Map(curveEstimates.map((e) => [e.user_id, anchorAtZero(e.agi_curve!, MIN_YEAR)]));
  const cdfData = SAMPLE_YEARS.map((year) => {
    const row: Record<string, number | string> = { year };
    for (const e of curveEstimates) {
      row[e.user_id] = probAt(anchoredCurves.get(e.user_id)!, year);
    }
    return row;
  });

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-8">
      <h2 className="text-lg font-semibold">Distribution</h2>

      {/* AGI timeline CDF overlay */}
      {curveEstimates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-blue-400 mb-4">AGI timeline — cumulative P(AGI by year)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cdfData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(y) => String(y)}
                interval={Math.max(0, Math.floor(SAMPLE_YEARS.length / 6) - 1)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
                width={36}
              />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af", fontSize: 12 }}
                formatter={(value: number, userId: string) => {
                  const user = userMap.get(userId);
                  return [`${(value * 100).toFixed(1)}%`, user?.name.split(" ")[0] ?? userId];
                }}
              />
              <ReferenceLine y={0.5} stroke="#374151" strokeDasharray="3 3" />
              <ReferenceLine y={1} stroke="#374151" strokeDasharray="3 3" />
              {curveEstimates.map((e, idx) => (
                <Line
                  key={e.user_id}
                  type="monotone"
                  dataKey={e.user_id}
                  stroke={USER_COLORS[idx % USER_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {curveEstimates.map((e, idx) => {
              const user = userMap.get(e.user_id);
              return (
                <div key={e.user_id} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span
                    className="inline-block w-3 h-0.5 rounded"
                    style={{ background: USER_COLORS[idx % USER_COLORS.length] }}
                  />
                  {user?.name.split(" ")[0] ?? "?"}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scalar questions dot strips */}
      <div className="space-y-6">
        {QUESTIONS.map((q) => {
          const color = QUESTION_COLORS[q.key];

          const points = activeEstimates
            .map((e) => ({ user: userMap.get(e.user_id)!, value: e[q.key] }))
            .filter((p) => p.value !== null && p.user) as { user: User; value: number }[];

          if (points.length === 0) return null;

          const mean = points.reduce((s, p) => s + p.value, 0) / points.length;

          return (
            <div key={q.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color }}>
                  {q.label}
                </span>
                <span className="text-xs text-gray-500">
                  avg {pct(mean)}
                </span>
              </div>

              {/* Track */}
              <div className="relative h-10">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700" />

                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                  <div
                    key={v}
                    className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${v * 100}%` }}
                  >
                    <div className="w-px h-2 bg-gray-600" />
                  </div>
                ))}

                {/* Mean marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full opacity-60"
                  style={{ left: `${mean * 100}%`, backgroundColor: color }}
                />

                {/* User dots */}
                {points.map(({ user, value }) => (
                  <div
                    key={user.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                    style={{ left: `${value * 100}%` }}
                  >
                    {user.picture ? (
                      <img
                        src={user.picture}
                        className="w-7 h-7 rounded-full cursor-default"
                        style={{ outline: `2px solid ${color}` }}
                        alt={user.name}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-default"
                        style={{ backgroundColor: color }}
                      >
                        {user.name[0]}
                      </div>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      <span className="text-gray-300">{user.name.split(" ")[0]}</span>
                      <span className="text-gray-500 ml-1">{pct(value)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Axis labels */}
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
