import type { Estimate } from "../types";
import { QUESTIONS, QUESTION_COLORS } from "../types";

interface Props {
  estimates: Estimate[];
  selectedUser: string | null;
}

function pct(v: number | null): string {
  if (v === null) return null as any;
  return `${(v * 100).toFixed(1)}%`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function EstimateLog({ estimates, selectedUser }: Props) {
  const filtered = selectedUser
    ? estimates.filter((e) => e.user_id === selectedUser)
    : estimates;

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
        {filtered.slice(0, 100).map((e) => (
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
                  <span className="font-medium text-sm text-gray-100">{e.user_name}</span>
                  <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(e.created_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {QUESTIONS.map((q) => {
                    const val = e[q.key];
                    if (val === null) return null;
                    return (
                      <span
                        key={q.key}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-800 font-mono"
                        style={{ color: QUESTION_COLORS[q.key] }}
                      >
                        {q.label}: {pct(val)}
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
        ))}
      </ul>
    </div>
  );
}
