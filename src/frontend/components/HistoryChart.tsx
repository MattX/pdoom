import type { Estimate, User } from "../types";
import { QUESTIONS, QUESTION_COLORS } from "../types";

interface Props {
  estimates: Estimate[];
  users: User[];
  selectedUser: string | null;
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

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-5">
      <h2 className="text-lg font-semibold">Distribution</h2>

      <div className="space-y-6">
        {QUESTIONS.map((q) => {
          const color = QUESTION_COLORS[q.key];

          // Collect (user, value) pairs for this question
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
                  avg {(mean * 100).toFixed(1)}%
                </span>
              </div>

              {/* Track */}
              <div className="relative h-10">
                {/* Axis line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700" />

                {/* Tick marks at 25% intervals */}
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
                      <span className="text-gray-500 ml-1">{(value * 100).toFixed(1)}%</span>
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
