import { NextRequest, NextResponse } from "next/server";
import { parseRounding } from "@/lib/organizerInput";
import { rebalanceFloorSlots } from "@/lib/floorRebalance";

/** 区切り方の変更などで、個別の枠を編集せずにフロア全体の時間を再計算する */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const rounding = parseRounding((body as Record<string, unknown>)?.rounding);
  const result = await rebalanceFloorSlots(id, rounding);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ slots: result.slots });
}
