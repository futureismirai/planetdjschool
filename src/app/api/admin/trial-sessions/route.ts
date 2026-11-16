import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseTrialSessionInput } from "@/lib/trialSessionInput";
import { sendMail } from "@/lib/mailer";
import { buildInstructorTrialRegisteredEmail } from "@/lib/emailTemplates";
import { getInstructorEmailByName } from "@/lib/instructors";
import { DEFAULT_LOCATION } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseTrialSessionInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const trialSession = await prisma.trialSession.create({ data: parsed.data });

  try {
    const instructorEmail = await getInstructorEmailByName(trialSession.instructorName);
    if (instructorEmail) {
      const { subject, text, html } = buildInstructorTrialRegisteredEmail({
        instructorName: trialSession.instructorName,
        datetime: trialSession.datetime,
        location: trialSession.location ?? DEFAULT_LOCATION,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
    }
  } catch (mailError) {
    console.error("講師への新規体験会登録通知メールの送信に失敗しました:", mailError);
  }

  return NextResponse.json({ trialSession }, { status: 201 });
}
