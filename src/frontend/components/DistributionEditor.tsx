import { useRef, useState } from "react";
import {
  clamp,
  increments,
  insertYear,
  probAt,
  removeAt as removePoint,
  setProbAt,
  setYearAt,
  MIN_YEAR,
  MAX_YEAR,
  type DistPoint,
} from "../../shared/distribution";

export type { DistPoint } from "../../shared/distribution";

interface Props {
  points: DistPoint[];
  onChange: (points: DistPoint[]) => void;
  minYear?: number;
  maxYear?: number;
  /** Previous estimate to render as a faint reference line while editing. */
  reference?: DistPoint[];
}

// ---- geometry (fixed viewBox, scales responsively) ----
const VB_W = 600;
const VB_H = 374;
const M = { l: 40, r: 14, t: 14, b: 110 };
const PLOT = { x: M.l, y: M.t, w: VB_W - M.l - M.r, h: VB_H - M.t - M.b };
const BAR_H = 56;
const BAR_TOP = PLOT.y + PLOT.h + 30;

export default function DistributionEditor({
  points,
  onChange,
  minYear = MIN_YEAR,
  maxYear = MAX_YEAR,
  reference,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number>(-1);
  const [dragging, setDragging] = useState(false);

  const N = points.length;
  const colW = PLOT.w / N;
  const colLeft = (i: number) => PLOT.x + (PLOT.w * i) / N;
  const colX = (i: number) => PLOT.x + (PLOT.w * (i + 0.5)) / N;
  const valToY = (v: number) => PLOT.y + (1 - v) * PLOT.h;
  const yToVal = (y: number) => clamp(1 - (y - PLOT.y) / PLOT.h, 0, 1);

  // ---- mutations (delegate to the pure model in distribution.ts) ----
  const setProb = (i: number, p: number) => onChange(setProbAt(points, i, p));

  const setYear = (i: number, year: number) => {
    const res = setYearAt(points, i, year, minYear, maxYear);
    onChange(res.points);
    setSelected(res.index); // follow the point after re-sort
  };

  const addYear = () => {
    const res = insertYear(points, selected, minYear, maxYear);
    onChange(res.points);
    setSelected(res.index);
  };

  const removeAt = (i: number) => {
    if (N <= 2) return;
    onChange(removePoint(points, i));
    setSelected(-1);
  };

  // ---- pointer dragging (vertical only) ----
  const toSvg = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VB_W,
      y: ((e.clientY - r.top) / r.height) * VB_H,
    };
  };
  const nearestCol = (x: number) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(x - colX(i));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const onDown = (e: React.PointerEvent) => {
    const p = toSvg(e);
    if (p.y < PLOT.y - 12 || p.y > PLOT.y + PLOT.h + 12) return;
    const i = nearestCol(p.x);
    setSelected(i);
    setDragging(true);
    svgRef.current?.setPointerCapture(e.pointerId);
    setProb(i, yToVal(p.y));
    e.preventDefault();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging || selected < 0) return;
    setProb(selected, yToVal(toSvg(e).y));
    e.preventDefault();
  };
  const onUp = () => setDragging(false);

  // ---- derived: incremental probabilities (the implied "PDF") ----
  const incs = increments(points);
  const maxInc = Math.max(0.0001, ...incs.map((s) => s.p));

  // Reference (previous) curve, sampled at the current columns' years so it
  // stays aligned even as anchors are added / moved / removed.
  const refD =
    reference && reference.length >= 2
      ? points
          .map(
            (pt, i) =>
              `${i ? "L" : "M"} ${colX(i)} ${valToY(probAt(reference, pt.year))} `,
          )
          .join("")
      : null;

  const linePts = points.map((pt, i) => [colX(i), valToY(pt.p)] as const);
  const areaD =
    `M ${linePts[0][0]} ${PLOT.y + PLOT.h} ` +
    linePts.map(([x, y]) => `L ${x} ${y} `).join("") +
    `L ${linePts[N - 1][0]} ${PLOT.y + PLOT.h} Z`;
  const lineD = linePts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y} `).join("");

  return (
    <div className="select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* y gridlines */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = valToY(p / 100);
          return (
            <g key={p}>
              <line x1={PLOT.x} y1={y} x2={PLOT.x + PLOT.w} y2={y} stroke={p % 50 ? "#232b39" : "#374151"} strokeWidth={1} />
              <text x={PLOT.x - 8} y={y + 4} textAnchor="end" className="fill-gray-600 text-[11px]">{p}%</text>
            </g>
          );
        })}

        {/* column highlight for selected */}
        {selected >= 0 && (
          <rect x={colLeft(selected)} y={PLOT.y} width={colW} height={PLOT.h} fill="rgba(96,165,250,0.07)" />
        )}

        {/* previous estimate — faint reference line */}
        {refD && (
          <path
            d={refD}
            fill="none"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
        )}

        {/* CDF area + line */}
        <path d={areaD} fill="rgba(59,130,246,0.12)" />
        <path d={lineD} fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinejoin="round" />

        {/* handles + year labels */}
        {points.map((pt, i) => {
          const [hx, hy] = linePts[i];
          const active = i === selected;
          return (
            <g key={i}>
              <circle cx={hx} cy={hy} r={active ? 9 : 7} fill={active ? "#fff" : "#3b82f6"} stroke="#0b0f17" strokeWidth={2} pointerEvents="none" />
              <text
                x={hx}
                y={PLOT.y + PLOT.h + 18}
                textAnchor="middle"
                onPointerDown={(e) => { e.stopPropagation(); setSelected(i); }}
                className={`text-[11px] cursor-pointer ${active ? "fill-blue-300" : "fill-gray-500"}`}
              >
                {pt.year}
              </text>
            </g>
          );
        })}

        {/* PDF bars — N periods + "never" get their own equal slots */}
        <line x1={PLOT.x} y1={BAR_TOP + BAR_H} x2={PLOT.x + PLOT.w} y2={BAR_TOP + BAR_H} stroke="#232b39" strokeWidth={1} />
        {incs.map((seg, k) => {
          const slotW = PLOT.w / incs.length;
          const bx = PLOT.x + slotW * k + slotW * 0.18;
          const bw = slotW * 0.64;
          const bh = (seg.p / maxInc) * BAR_H;
          return (
            <g key={k}>
              <rect x={bx} y={BAR_TOP + BAR_H - bh} width={bw} height={bh} rx={2} fill={seg.never ? "#ef4444" : "#2563eb"} />
              <text x={bx + bw / 2} y={BAR_TOP + BAR_H - bh - 4} textAnchor="middle" className="fill-gray-300 text-[10px]">{Math.round(seg.p * 100)}%</text>
              <text x={bx + bw / 2} y={BAR_TOP + BAR_H + 12} textAnchor="middle" className="fill-gray-600 text-[9px]">{seg.never ? "never" : seg.label.replace(/^≤/, "≤")}</text>
            </g>
          );
        })}
      </svg>

      {/* ---- year editing toolbar (mobile-friendly) ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {selected >= 0 ? (
          <>
            <span className="text-sm text-gray-400">Year:</span>
            <button onClick={() => setYear(selected, points[selected].year - 5)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm">−5</button>
            <button onClick={() => setYear(selected, points[selected].year - 1)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm">−1</button>
            <input
              type="number"
              value={points[selected].year}
              onChange={(e) => setYear(selected, parseInt(e.target.value || "0", 10))}
              className="w-20 text-center bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-100 text-sm tabular-nums focus:outline-none focus:border-blue-500"
            />
            <button onClick={() => setYear(selected, points[selected].year + 1)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm">+1</button>
            <button onClick={() => setYear(selected, points[selected].year + 5)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm">+5</button>
            <button
              onClick={() => removeAt(selected)}
              disabled={N <= 2}
              className="px-2.5 py-1.5 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm disabled:opacity-40"
            >
              Remove
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-500">Tap a point or year to edit it.</span>
        )}
        <button onClick={addYear} className="ml-auto px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">+ Add year</button>
      </div>

      {/* ---- numeric table (precise / alt input) ---- */}
      <table className="w-full mt-4 text-sm tabular-nums">
        <thead>
          <tr className="text-gray-500 text-xs">
            <th className="text-left font-medium py-1">By year</th>
            <th className="text-right font-medium py-1">Cumulative</th>
            <th className="text-right font-medium py-1">In period</th>
          </tr>
        </thead>
        <tbody>
          {points.map((pt, i) => (
            <tr key={i} className={`border-t border-gray-800 ${i === selected ? "bg-blue-500/5" : ""}`}>
              <td className="py-1.5">
                <button onClick={() => setSelected(i)} className={`${i === selected ? "text-blue-300" : "text-gray-300"}`}>
                  by {pt.year}
                </button>
              </td>
              <td className="text-right py-1.5">
                <input
                  type="number"
                  value={Math.round(pt.p * 100)}
                  onFocus={() => setSelected(i)}
                  onChange={(e) => setProb(i, (parseFloat(e.target.value) || 0) / 100)}
                  className="w-16 text-right bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-100 focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-500 ml-1">%</span>
              </td>
              <td className="text-right py-1.5 text-gray-400">+{Math.round(incs[i].p * 100)}%</td>
            </tr>
          ))}
          <tr className="border-t border-gray-800">
            <td className="py-1.5 text-gray-400">never</td>
            <td className="text-right py-1.5 text-gray-600">—</td>
            <td className="text-right py-1.5 text-red-300">{Math.round(incs[N].p * 100)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
