/** 出演者一覧をコピー用のテキストに変換する */
export function formatPerformerRosterText(
  name: string,
  entries: { name: string; snsHandle: string | null; isCategory?: boolean }[],
  includeSns: boolean,
  snsParentheses: boolean = true
): string {
  const lines = [name, ""];
  for (const entry of entries) {
    if (entry.isCategory) {
      // 分類の見出しの前には必ず1行空ける（ただし空行が連続しないようにする）
      if (lines[lines.length - 1] !== "") lines.push("");
      lines.push(entry.name);
      continue;
    }
    if (includeSns && entry.snsHandle) {
      const handle = `@${entry.snsHandle.replace(/^@/, "")}`;
      lines.push(`${entry.name}  ${snsParentheses ? `(${handle} )` : handle}`);
    } else {
      lines.push(entry.name);
    }
  }
  return lines.join("\n");
}
