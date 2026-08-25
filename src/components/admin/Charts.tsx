/**
 * The dashboard's charts.
 *
 * Drawn as SVG on the server rather than with a charting library. Four small
 * charts of thirty-five orders do not justify shipping a hundred and eighty
 * kilobytes of JavaScript to draw them, and rendering them server-side means
 * they are there in the first paint rather than appearing a moment later.
 *
 * They take colours from the site's own tokens, so the dashboard looks like the
 * rest of the site instead of like a charting library's default theme.
 */

const BRAND = "#e9162f";
const GRID = "rgba(255,255,255,0.07)";
const LABEL = "#7c7c86";

/** A frame with a title, so every chart on the page is the same object. */
export function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-bold tracking-wide text-white uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function money(cents: number): string {
  if (cents >= 100_000) return `$${Math.round(cents / 100_000)}k`;
  return `$${Math.round(cents / 100)}`;
}

/**
 * Revenue by month.
 *
 * A filled line rather than bars: twelve months read as a shape, and the shape
 * is the point. The area under it is what makes a quiet month obvious.
 */
export function RevenueLine({ monthlyCents }: { monthlyCents: number[] }) {
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 8, bottom: 24, left: 44 };

  const peak = Math.max(1, ...monthlyCents);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const x = (index: number) =>
    padding.left + (index / (monthlyCents.length - 1)) * plotWidth;
  const y = (cents: number) =>
    padding.top + plotHeight - (cents / peak) * plotHeight;

  const line = monthlyCents.map((cents, index) => `${x(index)},${y(cents)}`);
  const area = `${padding.left},${padding.top + plotHeight} ${line.join(" ")} ${
    padding.left + plotWidth
  },${padding.top + plotHeight}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
      role="img"
      aria-label="Revenue by month"
    >
      <defs>
        <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity="0.35" />
          <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((step) => (
        <g key={step}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotHeight * step}
            y2={padding.top + plotHeight * step}
            stroke={GRID}
          />
          <text
            x={padding.left - 8}
            y={padding.top + plotHeight * step + 4}
            textAnchor="end"
            fontSize="10"
            fill={LABEL}
          >
            {money(peak * (1 - step))}
          </text>
        </g>
      ))}

      <polygon points={area} fill="url(#revenue-fill)" />
      <polyline
        points={line.join(" ")}
        fill="none"
        stroke={BRAND}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {monthlyCents.map((cents, index) =>
        cents > 0 ? (
          <circle key={index} cx={x(index)} cy={y(cents)} r="3" fill={BRAND} />
        ) : null,
      )}

      {months.map((label, index) => (
        <text
          key={index}
          x={x(index)}
          y={height - 6}
          textAnchor="middle"
          fontSize="10"
          fill={LABEL}
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/** Orders per day, most recent last. */
export function DailyBars({
  days,
}: {
  days: { date: string; count: number }[];
}) {
  if (days.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No orders yet.</p>;
  }

  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 8, bottom: 26, left: 28 };
  const peak = Math.max(1, ...days.map((day) => day.count));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = plotWidth / days.length;
  const barWidth = Math.max(3, Math.min(18, step - 4));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
      role="img"
      aria-label="Orders per day"
    >
      {[0, 0.5, 1].map((fraction) => (
        <line
          key={fraction}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotHeight * fraction}
          y2={padding.top + plotHeight * fraction}
          stroke={GRID}
        />
      ))}

      {days.map((day, index) => {
        const barHeight = (day.count / peak) * plotHeight;
        return (
          <rect
            key={day.date}
            x={padding.left + index * step + (step - barWidth) / 2}
            y={padding.top + plotHeight - barHeight}
            width={barWidth}
            height={Math.max(2, barHeight)}
            rx="2"
            fill={BRAND}
            opacity={0.55 + 0.45 * (day.count / peak)}
          >
            <title>{`${day.date}: ${day.count}`}</title>
          </rect>
        );
      })}

      <text x={padding.left} y={height - 6} fontSize="10" fill={LABEL}>
        {days[0]?.date.slice(5)}
      </text>
      <text
        x={width - padding.right}
        y={height - 6}
        textAnchor="end"
        fontSize="10"
        fill={LABEL}
      >
        {days[days.length - 1]?.date.slice(5)}
      </text>
    </svg>
  );
}

/**
 * How the orders divide, as a ring with the total in the middle.
 *
 * A ring rather than a pie: the hole is where the number goes, and reading a
 * number is easier than judging the angle of a slice.
 */
export function StatusRing({
  counts,
  colours,
}: {
  counts: Record<string, number>;
  colours: Record<string, string>;
}) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No orders yet.</p>;
  }

  const radius = 70;
  const thickness = 22;
  const circumference = 2 * Math.PI * radius;
  let travelled = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44" role="img" aria-label="Orders by status">
        <g transform="translate(90,90) rotate(-90)">
          {entries.map(([status, count]) => {
            const share = count / total;
            const dash = `${share * circumference} ${circumference}`;
            const offset = -travelled * circumference;
            travelled += share;

            return (
              <circle
                key={status}
                r={radius}
                fill="none"
                stroke={colours[status] ?? BRAND}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text
          x="90"
          y="86"
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill="#ffffff"
        >
          {total}
        </text>
        <text x="90" y="104" textAnchor="middle" fontSize="10" fill={LABEL}>
          ORDERS
        </text>
      </svg>

      <ul className="space-y-2">
        {entries.map(([status, count]) => (
          <li key={status} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: colours[status] ?? BRAND }}
            />
            <span className="text-gray-300">{status}</span>
            <span className="ml-auto font-semibold text-white tabular-nums">
              {count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Revenue per status, as a row of labelled bars. */
export function RevenueByStatus({
  revenueCents,
  colours,
}: {
  revenueCents: Record<string, number>;
  colours: Record<string, string>;
}) {
  const entries = Object.entries(revenueCents).filter(([, cents]) => cents > 0);
  const peak = Math.max(1, ...entries.map(([, cents]) => cents));

  if (entries.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No revenue yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {entries.map(([status, cents]) => (
        <li key={status}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-gray-300">{status}</span>
            <span className="font-semibold text-white tabular-nums">
              ${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (cents / peak) * 100)}%`,
                backgroundColor: colours[status] ?? BRAND,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
