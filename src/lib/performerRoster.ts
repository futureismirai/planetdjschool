/** 出演者一覧をコピー用のテキストに変換する */
export function formatPerformerRosterText(
  name: string,
  entries: { name: string; snsHandle: string | null }[],
  includeSns: boolean
): string {
  const lines = [name, ""];
  for (const entry of entries) {
    if (includeSns && entry.snsHandle) {
      const handle = `@${entry.snsHandle.replace(/^@/, "")}`;
      lines.push(`${entry.name}  (${handle} )`);
    } else {
      lines.push(entry.name);
    }
  }
  return lines.join("\n");
}
