import type { ChoiceAggregation } from "@/lib/surveyCharts";

// dataviz skillの検証済みカテゴリカルパレット(8色)のうち、先頭7色を使用。
// 「その他」バケットは識別子ではないため、専用のグレー(ラベル用のmuted色)を使う。
const SLICE_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
];
const OTHER_COLOR = "#898781";
const YELLOW = "#eda100";

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleInRadians), y: cy + r * Math.sin(angleInRadians) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

/**
 * アンケートの単一設問(選択式)の回答分布を円グラフで表示する。
 * 1回しか出現しなかった回答(自由記述の「その他」の可能性が高いもの)は、
 * 円グラフ上は灰色の「その他」としてまとめ、実際の記入内容はグラフの下にコンパクトに列挙する。
 */
export function SurveyPieChart({ title, aggregation }: { title: string; aggregation: ChoiceAggregation }) {
  const { matchedLabel, categories, otherAnswers, totalAnswers } = aggregation;

  if (!matchedLabel) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-xs text-slate-400">該当する質問がフォームに見つかりませんでした。</p>
      </div>
    );
  }

  if (totalAnswers === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-xs text-slate-400">回答がまだありません。</p>
      </div>
    );
  }

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  let cursor = 0;
  const slices = categories.map((c) => {
    const fraction = c.count / totalAnswers;
    const startAngle = cursor * 360;
    cursor += fraction;
    const endAngle = cursor * 360;
    const midAngle = (startAngle + endAngle) / 2;
    const index = categories.filter((other) => other.label !== "その他").indexOf(c);
    const color = c.label === "その他" ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];
    const percent = Math.round(fraction * 100);
    const labelPos = polarToCartesian(cx, cy, r * 0.65, midAngle);
    return {
      startAngle,
      endAngle,
      color,
      percent,
      labelPos,
      textColor: color === YELLOW ? "#0b0b0b" : "#ffffff",
      label: c.label,
      count: c.count,
    };
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {matchedLabel}（回答{totalAnswers}件）
      </p>

      <div className="mt-3 flex flex-col items-center gap-4">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="shrink-0"
          role="img"
          aria-label={`${title}の回答割合`}
        >
          {slices.length === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill={slices[0].color}>
              <title>{`${slices[0].label}: ${slices[0].count}件（100%）`}</title>
            </circle>
          ) : (
            slices.map((s) => (
              <path key={s.label} d={describeArc(cx, cy, r, s.startAngle, s.endAngle)} fill={s.color}>
                <title>{`${s.label}: ${s.count}件（${s.percent}%）`}</title>
              </path>
            ))
          )}
          {slices
            .filter((s) => s.percent >= 8)
            .map((s) => (
              <text
                key={s.label}
                x={slices.length === 1 ? cx : s.labelPos.x}
                y={slices.length === 1 ? cy : s.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill={s.textColor}
              >
                {s.percent}%
              </text>
            ))}
        </svg>

        <ul className="w-full min-w-0 space-y-1.5 text-xs">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="min-w-0 flex-1 truncate text-slate-700">{s.label}</span>
              <span className="shrink-0 text-slate-400">
                {s.count}件・{s.percent}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      {otherAnswers.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">
          その他の回答: {otherAnswers.join("、")}
        </p>
      )}
    </div>
  );
}
