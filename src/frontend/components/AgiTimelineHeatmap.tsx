import { useMemo, useRef, useState, useEffect } from "react";
import type { Estimate } from "../types";
import { probAt, anchorAtZero, MIN_YEAR } from "../../shared/distribution";

const CHART_END_YEAR = 2050;
const YEARS: number[] = [];
for (let y = MIN_YEAR; y <= CHART_END_YEAR; y++) YEARS.push(y);

interface Props {
  estimates: Estimate[];
  selectedUser: string | null;
}

type Row = { label: string; probs: number[] };

type RGB = [number, number, number];
function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
// Viridis color stops at t = 0, 0.25, 0.5, 0.75, 1
const VIRIDIS: [number, RGB][] = [
  [0.00, [68,   1, 84]],
  [0.25, [59,  82, 139]],
  [0.50, [33, 145, 140]],
  [0.75, [94, 201,  98]],
  [1.00, [253, 231,  37]],
];
function heatColor(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  for (let i = 1; i < VIRIDIS.length; i++) {
    if (t <= VIRIDIS[i][0]) {
      const [t0, c0] = VIRIDIS[i - 1];
      const [t1, c1] = VIRIDIS[i];
      const [r, g, b] = lerp(c0, c1, (t - t0) / (t1 - t0));
      return `rgb(${r},${g},${b})`;
    }
  }
  const [, last] = VIRIDIS[VIRIDIS.length - 1];
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function medianOf(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export default function AgiTimelineHeatmap({ estimates, selectedUser }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    year: number;
    date: string;
    prob: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const relevantEstimates = estimates.filter(
      (e) =>
        e.agi_curve &&
        e.agi_curve.length > 0 &&
        (!selectedUser || e.user_id === selectedUser)
    );
    if (relevantEstimates.length === 0) return [];

    const oldestTs = Math.min(...relevantEstimates.map((e) => e.created_at));
    const nowTs = Math.floor(Date.now() / 1000);
    const N = 20;

    // N equally-spaced timestamps from now (top) to oldest estimate (bottom)
    const timePoints = Array.from({ length: N }, (_, i) =>
      Math.round(nowTs - (i / (N - 1)) * (nowTs - oldestTs))
    );

    return timePoints.map((ts) => {
      // Standing prediction at ts: each user's most recent estimate on or before ts
      const activeByUser = new Map<string, (typeof estimates)[0]>();
      for (const e of relevantEstimates) {
        if (e.created_at <= ts) {
          const existing = activeByUser.get(e.user_id);
          if (!existing || e.created_at > existing.created_at) {
            activeByUser.set(e.user_id, e);
          }
        }
      }
      const curves = [...activeByUser.values()].map((e) =>
        anchorAtZero(e.agi_curve!, MIN_YEAR)
      );
      return {
        label: formatDate(ts),
        probs:
          curves.length > 0
            ? YEARS.map((y) => medianOf(curves.map((c) => probAt(c, y))))
            : YEARS.map(() => 0),
      };
    });
  }, [estimates, selectedUser]);

  if (rows.length === 0) return null;

  const CELL_H = 22;
  const LEFT = 72;
  const TOP = 28;
  const RIGHT = 16;
  const BOTTOM = 32; // space for color scale
  const availW = Math.max(200, containerWidth - LEFT - RIGHT);
  const cellW = availW / YEARS.length;
  const svgH = TOP + rows.length * CELL_H + BOTTOM;

  const tickYears = YEARS.filter((y) => y % 5 === 0);

  // Color scale bar geometry
  const scaleY = TOP + rows.length * CELL_H + 12;
  const scaleW = availW;
  const scaleH = 8;
  const scaleStops = Array.from({ length: 20 }, (_, i) => i / 19);

  return (
    <div ref={containerRef} className="relative select-none">
      <svg
        width={containerWidth}
        height={svgH}
        style={{ overflow: "visible" }}
      >
        {/* X axis labels */}
        {tickYears.map((y) => {
          const i = YEARS.indexOf(y);
          const x = LEFT + (i + 0.5) * cellW;
          return (
            <text
              key={y}
              x={x}
              y={TOP - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {y}
            </text>
          );
        })}

        {/* Heatmap rows */}
        {rows.map((row, ri) => {
          const rowY = TOP + ri * CELL_H;
          return (
            <g key={ri}>
              <text
                x={LEFT - 6}
                y={rowY + CELL_H / 2 + 4}
                textAnchor="end"
                fontSize={9}
                fill="#6b7280"
              >
                {row.label}
              </text>
              {row.probs.map((p, ci) => (
                <rect
                  key={ci}
                  x={LEFT + ci * cellW}
                  y={rowY}
                  width={cellW + 0.5}
                  height={CELL_H}
                  fill={heatColor(p)}
                  onMouseEnter={(e) => {
                    const svgEl = (e.target as SVGRectElement).closest("svg")!;
                    const svgRect = svgEl.getBoundingClientRect();
                    const container = containerRef.current!.getBoundingClientRect();
                    const targetRect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({
                      x: targetRect.left - container.left + targetRect.width / 2,
                      y: targetRect.top - svgRect.top,
                      year: YEARS[ci],
                      date: row.label,
                      prob: p,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "crosshair" }}
                />
              ))}
            </g>
          );
        })}

        {/* Color scale bar */}
        <defs>
          <linearGradient id="heatGradient" x1="0" x2="1" y1="0" y2="0">
            {scaleStops.map((t, i) => (
              <stop
                key={i}
                offset={`${(t * 100).toFixed(1)}%`}
                stopColor={heatColor(t)}
              />
            ))}
          </linearGradient>
        </defs>
        <rect
          x={LEFT}
          y={scaleY}
          width={scaleW}
          height={scaleH}
          fill="url(#heatGradient)"
          rx={2}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text
            key={t}
            x={LEFT + t * scaleW}
            y={scaleY + scaleH + 12}
            textAnchor="middle"
            fontSize={9}
            fill="#6b7280"
          >
            {`${Math.round(t * 100)}%`}
          </text>
        ))}
        <text
          x={LEFT + scaleW / 2}
          y={scaleY + scaleH + 22}
          textAnchor="middle"
          fontSize={9}
          fill="#4b5563"
        >
          P(AGI by year)
        </text>
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="text-gray-400">{tooltip.date}</span>
          <span className="mx-1.5 text-gray-600">·</span>
          <span className="text-blue-400">AGI by {tooltip.year}</span>
          <span className="mx-1.5 text-gray-600">·</span>
          <span className="text-white font-medium">
            {(tooltip.prob * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
