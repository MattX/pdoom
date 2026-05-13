import { useEffect, useState } from "react";
import { api } from "../api";

interface MetaculusData {
  title: string;
  resolution_criteria: string;
  community_prediction?: {
    full?: {
      q2?: number;
      q1?: number;
      q3?: number;
    };
  };
  nr_forecasters?: number;
  close_time?: string;
  url?: string;
}

export default function MetaculusPanel() {
  const [data, setData] = useState<MetaculusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .metaculus()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Metaculus comparison</h2>
        <p className="text-gray-500 text-sm">Could not load Metaculus data: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Metaculus comparison</h2>
        <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  const median = data.community_prediction?.full?.q2;
  const q1 = data.community_prediction?.full?.q1;
  const q3 = data.community_prediction?.full?.q3;

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Metaculus comparison</h2>
          <p className="text-sm text-gray-400 mt-1">
            <a
              href="https://www.metaculus.com/questions/5121/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              When will the first AGI be devised, tested, and announced?
            </a>
          </p>
        </div>
        {data.nr_forecasters && (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {data.nr_forecasters.toLocaleString()} forecasters
          </span>
        )}
      </div>

      {median !== undefined ? (
        <div className="flex flex-wrap gap-6">
          {q1 !== undefined && (
            <div>
              <p className="text-xs text-gray-500">25th pct</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">{Math.round(q1)}</p>
            </div>
          )}
          {median !== undefined && (
            <div>
              <p className="text-xs text-gray-500">Median year</p>
              <p className="text-3xl font-mono font-bold text-green-400">{Math.round(median)}</p>
            </div>
          )}
          {q3 !== undefined && (
            <div>
              <p className="text-xs text-gray-500">75th pct</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">{Math.round(q3)}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No community prediction data available.</p>
      )}

      {data.close_time && (
        <p className="text-xs text-gray-600">
          Closes {new Date(data.close_time).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}
    </div>
  );
}
