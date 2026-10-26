import type { Figure } from "@/lib/model";

/**
 * A source's figure, drawn with its own axes, units, scale and legend, and with the values our
 * reviewers read off it laid on top. A value stated in a table is a solid dot; a value estimated
 * by eye is a hollow dot with the range the reader couldn't narrow further.
 *
 * In this prototype the figure is drawn from the demo's data. A real deployment would show the
 * original image from the archived document beside it, since a redrawing can't prove what the
 * original showed.
 */
const W = 640;
const H = 340;
const M = { top: 46, right: 20, bottom: 52, left: 64 };

export function FigureChart({ figure, highlight = [] }: { figure: Figure; highlight?: string[] }) {
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (v: number) =>
    M.left + ((v - figure.xAxis.min) / (figure.xAxis.max - figure.xAxis.min)) * iw;
  const ly = (v: number) => Math.log10(v);
  const y =
    figure.yAxis.scale === "log"
      ? (v: number) =>
          M.top +
          ih -
          ((ly(v) - ly(figure.yAxis.min)) / (ly(figure.yAxis.max) - ly(figure.yAxis.min))) * ih
      : (v: number) =>
          M.top + ih - ((v - figure.yAxis.min) / (figure.yAxis.max - figure.yAxis.min)) * ih;

  const xTicks = Array.from({ length: Math.floor(figure.xAxis.max / 500) + 1 }, (_, i) => i * 500);
  const yTicks = figure.yAxis.scale === "log" ? [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1] : [];

  const extractions = figure.extractions.filter(
    (e) => highlight.length === 0 || highlight.includes(e.id),
  );
  const summary = `Chart: ${figure.yAxis.label} (${figure.yAxis.unit}, ${figure.yAxis.scale} scale) against ${figure.xAxis.label} (${figure.xAxis.unit}). ${extractions
    .map(
      (e) =>
        `${e.label}: ${e.value} ${e.unit}, ${e.method === "visually-estimated" ? `estimated by eye, range ${e.range?.[0]} to ${e.range?.[1]}` : "stated in a table"}`,
    )
    .join("; ")}.`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full max-w-2xl rounded border border-line bg-card"
      >
        {/* gridlines and ticks */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={M.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
            >
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={M.top + ih}
              y2={M.top + ih + 4}
              stroke="var(--color-muted)"
            />
            <text
              x={x(t)}
              y={M.top + ih + 17}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-muted)"
            >
              {t.toLocaleString("en-GB")}
            </text>
          </g>
        ))}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={M.top + ih}
          y2={M.top + ih}
          stroke="var(--color-muted)"
        />
        <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + ih} stroke="var(--color-muted)" />
        <text
          x={M.left + iw / 2}
          y={H - 12}
          textAnchor="middle"
          fontSize={12}
          fill="var(--color-ink)"
        >
          {figure.xAxis.label} ({figure.xAxis.unit})
        </text>
        <text
          transform={`translate(16 ${M.top + ih / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={12}
          fill="var(--color-ink)"
        >
          {figure.yAxis.label} ({figure.yAxis.unit}, {figure.yAxis.scale} scale)
        </text>

        {/* receptors marked on the source figure */}
        {/* Labels alternate between two heights so neighbouring receptors don't print over each other. */}
        {figure.markers.map((m, i) => (
          <g key={m.label}>
            <line
              x1={x(m.x)}
              x2={x(m.x)}
              y1={M.top - (i % 2 === 0 ? 4 : 16)}
              y2={M.top + ih}
              stroke="var(--color-muted)"
              strokeDasharray="2 3"
            />
            <text
              x={x(m.x) + 3}
              y={M.top - (i % 2 === 0 ? 6 : 20)}
              fontSize={10}
              fill="var(--color-muted)"
            >
              {m.label}
            </text>
          </g>
        ))}

        {figure.series.map((s) => (
          <polyline
            key={s.id}
            fill="none"
            stroke={s.style === "dashed" ? "var(--color-warn)" : "var(--color-doc)"}
            strokeWidth={2}
            strokeDasharray={s.style === "dashed" ? "6 4" : undefined}
            points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
          />
        ))}

        {/* what our reviewers read off it */}
        {extractions.map((e, i) => {
          const cx = x(e.x) + (i % 2 === 0 ? -5 : 5);
          return (
            <g key={e.id}>
              {e.range && (
                <line
                  x1={cx}
                  x2={cx}
                  y1={y(e.range[0])}
                  y2={y(e.range[1])}
                  stroke="var(--color-interp)"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={cx}
                cy={y(e.value)}
                r={4.5}
                fill={
                  e.method === "visually-estimated" ? "var(--color-card)" : "var(--color-interp)"
                }
                stroke="var(--color-interp)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {figure.series.map((s) => (
          <li key={s.id}>
            <span
              aria-hidden="true"
              style={{ color: s.style === "dashed" ? "var(--color-warn)" : "var(--color-doc)" }}
            >
              {s.style === "dashed" ? "– – –" : "———"}
            </span>{" "}
            {s.label} (source&rsquo;s legend)
          </li>
        ))}
        <li>
          <span aria-hidden="true" className="text-interp">
            ●
          </span>{" "}
          value stated in a table
        </li>
        <li>
          <span aria-hidden="true" className="text-interp">
            ○ │
          </span>{" "}
          value estimated by eye, with its range
        </li>
      </ul>
    </div>
  );
}

/** The same values as a table: exact numbers, method and who read them. */
export function ExtractionTable({ figure, ids }: { figure: Figure; ids?: string[] }) {
  const rows = figure.extractions.filter((e) => !ids || ids.includes(e.id));
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <caption className="text-left text-muted">Values read off the figure</caption>
      <thead>
        <tr className="border-b border-line text-left">
          <th className="py-1 pr-2">Point</th>
          <th className="py-1 pr-2">Value</th>
          <th className="py-1 pr-2">How it was read</th>
          <th className="py-1 pr-2">Read by</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr
            key={e.id}
            className="border-b border-line align-top"
            data-extraction={e.id}
            data-method={e.method}
          >
            <td className="py-1 pr-2">{e.label}</td>
            <td className="py-1 pr-2 whitespace-nowrap">
              {e.method === "visually-estimated" ? "≈ " : ""}
              {e.value} {e.unit}
              {e.range && (
                <span className="block text-muted">
                  range {e.range[0]}–{e.range[1]}
                </span>
              )}
            </td>
            <td className="py-1 pr-2">
              {e.method === "visually-estimated" ? (
                <strong>Estimated by eye</strong>
              ) : (
                "Stated in a table"
              )}
              <span className="block text-muted">{e.note}</span>
            </td>
            <td className="py-1 pr-2">{e.readBy}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
