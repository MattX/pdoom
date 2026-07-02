import type { Estimate } from "../types";
import { QUESTIONS, QUESTION_COLORS, CURVE_REF_YEARS } from "../types";
import { probAt } from "../../shared/distribution";

interface Props {
  estimates: Estimate[];
  selectedUser: string | null;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function delta(current: number, previous: number): string {
  const d = (current - previous) * 100;
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}pp`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

// Build a map from estimate id -> the previous estimate for that user (by created_at)
function buildPrevMap(estimates: Estimate[]): Map<number, Estimate> {
  const sorted = [...estimates].sort((a, b) => a.created_at - b.created_at);
  const lastByUser = new Map<string, Estimate>();
  const prevMap = new Map<number, Estimate>();
  for (const e of sorted) {
    const prev = lastByUser.get(e.user_id);
    if (prev) prevMap.set(e.id, prev);
    lastByUser.set(e.user_id, e);
  }
  return prevMap;
}

export default function EstimateLog({ estimates, selectedUser }: Props) {
  const filtered = selectedUser
    ? estimates.filter((e) => e.user_id === selectedUser)
    : estimates;

  const prevMap = buildPrevMap(estimates);

  if (filtered.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-gray-500 text-sm text-center">
        No entries yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Log</h2>
      </div>
      <ul className="divide-y divide-gray-800">
        {filtered.slice(0, 100).map((e) => {
          const prev = prevMap.get(e.id);
          return (
          <li key={e.id} className="p-4 hover:bg-gray-800/30 transition-colors">
            <div className="flex items-start gap-3">
              {e.user_picture ? (
                <img src={e.user_picture} className="w-7 h-7 rounded-full mt-0.5 flex-shrink-0" alt="" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs flex-shrink-0">
                  {e.user_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-sm text-gray-100">
                    {e.user_name}
                    {e.external && e.source && (
                      <a
                        href={e.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Source"
                        className="ml-1 text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </span>
                  <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(e.created_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {/* AGI curve summary — show P(by year) at a few reference years */}
                  {e.agi_curve && e.agi_curve.length > 0 && CURVE_REF_YEARS.map((y) => {
                    const cur = probAt(e.agi_curve!, y);
                    const prevVal = prev?.agi_curve && prev.agi_curve.length > 0
                      ? probAt(prev.agi_curve, y)
                      : null;
                    const d = prevVal !== null ? delta(cur, prevVal) : null;
                    const isPos = d !== null && !d.startsWith("-");
                    return (
                      <span
                        key={y}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-800 font-mono text-blue-300"
                      >
                        AGI by {y}: {pct(cur)}
                        {d !== null && (
                          <span className={`ml-1 ${isPos ? "text-red-400" : "text-green-400"}`}>
                            {d}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {/* Scalar questions */}
                  {QUESTIONS.map((q) => {
                    const val = e[q.key];
                    if (val === null) return null;
                    const prevVal = prev?.[q.key] ?? null;
                    const d = prevVal !== null ? delta(val, prevVal) : null;
                    const isPos = d !== null && !d.startsWith("-");
                    return (
                      <span
                        key={q.key}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-800 font-mono"
                        style={{ color: QUESTION_COLORS[q.key] }}
                      >
                        {q.label}: {pct(val)}
                        {d !== null && (
                          <span className={`ml-1 ${isPos ? "text-red-400" : "text-green-400"}`}>
                            {d}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                {e.note && (
                  <p className="text-sm text-gray-400 mt-1.5 italic">"{e.note}"</p>
                )}
              </div>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
