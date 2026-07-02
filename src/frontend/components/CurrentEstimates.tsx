import type { Estimate, User } from "../types";
import { QUESTIONS, QUESTION_COLORS, CURVE_REF_YEARS } from "../types";
import { probAt } from "../../shared/distribution";

interface Props {
  estimates: Estimate[];
  users: User[];
  selectedUser: string | null;
  onSelectUser: (id: string | null) => void;
}

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function CurrentEstimates({ estimates, users, selectedUser, onSelectUser }: Props) {
  // Get latest estimate per user (highest created_at, regardless of array order)
  const latestByUser = new Map<string, Estimate>();
  for (const e of estimates) {
    const cur = latestByUser.get(e.user_id);
    if (!cur || e.created_at > cur.created_at) latestByUser.set(e.user_id, e);
  }

  const rows = users
    .map((u) => ({ user: u, estimate: latestByUser.get(u.id) ?? null }))
    .filter((r) => r.estimate !== null);

  if (rows.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-gray-500 text-sm text-center">
        No estimates yet. Be the first!
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Current estimates</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onSelectUser(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selectedUser === null
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            All
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUser(u.id === selectedUser ? null : u.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                selectedUser === u.id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {u.picture && (
                <img src={u.picture} className="w-4 h-4 rounded-full" alt="" />
              )}
              {u.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Person</th>
              {CURVE_REF_YEARS.map((y) => (
                <th key={y} className="text-right px-4 py-3 font-medium text-blue-400">
                  AGI by {y}
                </th>
              ))}
              {QUESTIONS.map((q) => (
                <th
                  key={q.key}
                  className="text-right px-4 py-3 font-medium"
                  style={{ color: QUESTION_COLORS[q.key] }}
                >
                  {q.label}
                </th>
              ))}
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, estimate }) => (
              <tr
                key={user.id}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer ${
                  selectedUser === user.id ? "bg-gray-800/40" : ""
                }`}
                onClick={() => onSelectUser(user.id === selectedUser ? null : user.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.picture ? (
                      <img src={user.picture} className="w-6 h-6 rounded-full" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                        {user.name[0]}
                      </div>
                    )}
                    <span className="text-gray-100">{user.name}</span>
                    {user.external && user.source && (
                      <a
                        href={user.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Source"
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </td>
                {CURVE_REF_YEARS.map((y) => (
                  <td key={y} className="px-4 py-3 text-right tabular-nums">
                    <span className="font-mono text-blue-300">
                      {estimate!.agi_curve ? pct(probAt(estimate!.agi_curve, y)) : "—"}
                    </span>
                  </td>
                ))}
                {QUESTIONS.map((q) => (
                  <td key={q.key} className="px-4 py-3 text-right tabular-nums">
                    <span
                      className="font-mono"
                      style={{ color: estimate![q.key] !== null ? QUESTION_COLORS[q.key] : undefined }}
                    >
                      {pct(estimate![q.key])}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {estimate && new Date(estimate.created_at * 1000).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
