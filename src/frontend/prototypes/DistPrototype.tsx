import { useState } from "react";
import DistributionEditor, { type DistPoint } from "./DistributionEditor";

const DEFAULT: DistPoint[] = [
  { year: 2030, p: 0.2 },
  { year: 2035, p: 0.45 },
  { year: 2040, p: 0.6 },
  { year: 2050, p: 0.75 },
  { year: 2075, p: 0.88 },
  { year: 2100, p: 0.92 },
];

const PRESETS: Record<string, DistPoint[]> = {
  fast: [
    { year: 2028, p: 0.25 },
    { year: 2032, p: 0.6 },
    { year: 2040, p: 0.85 },
    { year: 2060, p: 0.97 },
  ],
  slow: [
    { year: 2035, p: 0.1 },
    { year: 2050, p: 0.35 },
    { year: 2075, p: 0.65 },
    { year: 2120, p: 0.85 },
  ],
};

export default function DistPrototype() {
  const [points, setPoints] = useState<DistPoint[]>(DEFAULT);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold">AGI timeline distribution — prototype</h1>
        <p className="text-sm text-gray-400 mt-1 mb-5">
          Drag the curve for probabilities. Tap a point/year, then use the stepper to move it. Add or remove years freely.
        </p>

        <div className="bg-gray-900 rounded-xl p-4">
          <DistributionEditor points={points} onChange={setPoints} />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => setPoints(PRESETS.fast)} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm">Preset: fast</button>
          <button onClick={() => setPoints(PRESETS.slow)} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm">Preset: slow</button>
          <button onClick={() => setPoints(DEFAULT)} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm">Reset</button>
        </div>

        <p className="text-xs text-gray-500 mt-6 mb-1">Stored payload (new schema — JSON array of points):</p>
        <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto">
{JSON.stringify({ distribution: points }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
