import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Estimate, User } from "../types";
import { QUESTIONS, QUESTION_COLORS } from "../types";
import { useState } from "react";

interface Props {
  estimates: Estimate[];
  users: User[];
  selectedUser: string | null;
}

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function pctTick(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

export default function HistoryChart({ estimates, users, selectedUser }: Props) {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const filtered = selectedUser ? estimates.filter((e) => e.user_id === selectedUser) : estimates;

  // Build chart data: one point per estimate, per user
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Group by user, build time series
  const seriesMap = new Map<string, { ts: number; value: number }[]>();

  for (const e of [...filtered].reverse()) {
    for (const q of QUESTIONS) {
      if (activeQuestion && q.key !== activeQuestion) continue;
      const val = e[q.key];
      if (val === null) continue;
      const user = userMap.get(e.user_id);
      if (!user) continue;
      const seriesKey = selectedUser ? q.label : `${user.name.split(" ")[0]} · ${q.short}`;
      if (!seriesMap.has(seriesKey)) seriesMap.set(seriesKey, []);
      seriesMap.get(seriesKey)!.push({ ts: e.created_at, value: val });
    }
  }

  // Flatten to chart-friendly format
  const allTs = [...new Set([...filtered].map((e) => e.created_at))].sort((a, b) => a - b);

  const data = allTs.map((ts) => {
    const pt: Record<string, any> = { ts, date: fmt(ts) };
    for (const [key, points] of seriesMap) {
      const match = points.find((p) => p.ts === ts);
      if (match) pt[key] = match.value;
    }
    return pt;
  });

  const seriesKeys = [...seriesMap.keys()];
  const palette = [
    "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ef4444",
    "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#f59e0b",
  ];

  if (data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-gray-500 text-sm text-center">
        No history to display yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">History</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveQuestion(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeQuestion === null
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            All
          </button>
          {QUESTIONS.map((q) => (
            <button
              key={q.key}
              onClick={() => setActiveQuestion(activeQuestion === q.key ? null : q.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeQuestion === q.key
                  ? "border-transparent text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
              style={activeQuestion === q.key ? { backgroundColor: QUESTION_COLORS[q.key], borderColor: QUESTION_COLORS[q.key] } : {}}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
          <YAxis
            tickFormatter={pctTick}
            domain={[0, 1]}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={44}
          />
          <Tooltip
            formatter={(val: number) => [`${(val * 100).toFixed(1)}%`]}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
          {seriesKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={palette[i % palette.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: palette[i % palette.length] }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
