import { useState } from "react";
import { api } from "../api";
import { QUESTIONS, type QuestionKey } from "../types";
import DistributionEditor, { type DistPoint } from "./DistributionEditor";

interface Props {
  onSubmitted: () => void;
}

const DEFAULT_CURVE: DistPoint[] = [
  { year: 2030, p: 0.1 },
  { year: 2040, p: 0.35 },
  { year: 2060, p: 0.65 },
  { year: 2100, p: 0.85 },
];

export default function EstimateForm({ onSubmitted }: Props) {
  const [curve, setCurve] = useState<DistPoint[]>(DEFAULT_CURVE);
  const [values, setValues] = useState<Partial<Record<QuestionKey, string>>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = { agi_curve: curve };

    for (const q of QUESTIONS) {
      const raw = values[q.key];
      if (raw !== undefined && raw !== "") {
        const n = parseFloat(raw);
        if (isNaN(n) || n < 0 || n > 100) {
          setError(`${q.label}: enter a number 0–100`);
          setLoading(false);
          return;
        }
        payload[q.key] = n / 100;
      }
    }
    if (note.trim()) payload.note = note.trim();

    try {
      await api.postEstimate(payload as Record<string, number | string | null>);
      setCurve(DEFAULT_CURVE);
      setValues({});
      setNote("");
      onSubmitted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-100">Submit estimates</h2>

      {/* AGI timeline distribution editor */}
      <div>
        <p className="text-sm text-gray-300 mb-3 font-medium">AGI timeline — P(AGI arrived by year)</p>
        <p className="text-xs text-gray-500 mb-4">
          Drag the handles to set cumulative probability, or use the table below. Add / remove year anchors as needed.
        </p>
        <DistributionEditor points={curve} onChange={setCurve} />
      </div>

      {/* Scalar questions */}
      {QUESTIONS.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUESTIONS.map((q) => (
            <label key={q.key} className="flex flex-col gap-1">
              <span className="text-sm text-gray-300">{q.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="—"
                  value={values[q.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [q.key]: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500 text-sm">%</span>
              </div>
            </label>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-300">Note (optional)</span>
        <input
          type="text"
          placeholder="Any context for this update…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
