import { prisma } from "@/lib/prisma";

// 新規イベント作成時や枠追加時に使われるプレースホルダー名は候補として保存しない
function isPlaceholderName(name: string): boolean {
  return name === "新しい出演者" || /^出演者\d+$/.test(name);
}

/** 出演者名とSNSアカウントの組み合わせを、次回以降のオートコンプリート候補として保存する */
export async function rememberPerformer(name: string, snsHandle: string | null | undefined): Promise<void> {
  const trimmedName = name.trim();
  const trimmedSns = snsHandle?.trim();
  if (!trimmedName || !trimmedSns || isPlaceholderName(trimmedName)) return;

  await prisma.performer.upsert({
    where: { name: trimmedName },
    update: { snsHandle: trimmedSns },
    create: { name: trimmedName, snsHandle: trimmedSns },
  });
}
