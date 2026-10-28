import type { FormResponse } from "./googleSheet";

export type ChoiceCategory = {
  label: string;
  count: number;
};

export type ChoiceAggregation = {
  /** 実際にマッチした質問文(列見出し)。見つからなければnull。 */
  matchedLabel: string | null;
  /** 件数の多い順。「その他」バケットは常に最後に入る(存在する場合)。 */
  categories: ChoiceCategory[];
  /** 「その他」バケットに含めた、1回しか出現しなかった自由記述の原文一覧。 */
  otherAnswers: string[];
  /** 空欄を除いた回答の総数。 */
  totalAnswers: number;
};

const OTHER_LABEL = "その他";
// 円グラフが読みにくくならないよう、よく出た回答から最大この件数までを個別のスライスにし、
// それ以外(複数回答の少数派・自由記述の「その他」)は1つの「その他」スライスにまとめる。
const MAX_CATEGORIES = 6;

/**
 * 体験会アンケートの回答一覧から、指定したキーワードを含む質問(列見出し)を探し、
 * その回答を集計して円グラフ用のデータを作る。
 *
 * チェックボックス形式(複数選択可)の設問はGoogleフォームのCSV書き出しでは
 * カンマ区切りで1セルにまとめられるため、カンマで分割してから集計する
 * (自由記述にカンマが含まれる場合は分割されてしまう可能性があるが、簡易的な集計として許容する)。
 *
 * 1回しか出現しなかった回答は、選択式の固定候補ではなく自由記述の「その他」である可能性が高いため、
 * 円グラフ上は「その他」としてまとめ、実際の記入内容は別途コンパクトに一覧できるようにする。
 */
export function aggregateChoiceField(
  responses: FormResponse[],
  labelKeyword: string
): ChoiceAggregation {
  const matchedLabel = responses
    .flatMap((r) => r.fields)
    .find((f) => f.label.includes(labelKeyword))?.label ?? null;

  if (!matchedLabel) {
    return { matchedLabel: null, categories: [], otherAnswers: [], totalAnswers: 0 };
  }

  const counts = new Map<string, number>();
  for (const response of responses) {
    const field = response.fields.find((f) => f.label === matchedLabel);
    const raw = field?.value.trim();
    if (!raw) continue;

    for (const part of raw.split(",")) {
      const value = part.trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const totalAnswers = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const main = sorted.filter(([, count]) => count >= 2).slice(0, MAX_CATEGORIES);
  const mainLabels = new Set(main.map(([label]) => label));
  const rest = sorted.filter(([label]) => !mainLabels.has(label));

  const categories: ChoiceCategory[] = main.map(([label, count]) => ({ label, count }));
  const otherAnswers = rest.map(([label]) => label);
  const otherCount = rest.reduce((sum, [, count]) => sum + count, 0);
  if (otherCount > 0) {
    categories.push({ label: OTHER_LABEL, count: otherCount });
  }

  return { matchedLabel, categories, otherAnswers, totalAnswers };
}
