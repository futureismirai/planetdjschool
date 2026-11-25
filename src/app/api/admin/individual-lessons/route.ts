import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseIndividualLessonInput } from "@/lib/individualLessonInput";
import { sendMail } from "@/lib/mailer";
import { buildInstructorIndividualLessonRegisteredEmail } from "@/lib/emailTemplates";
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

  const parsed = parseIndividualLessonInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const individualLesson = await prisma.individualLesson.create({ data: parsed.data });

  try {
    const instructorEmail = await getInstructorEmailByName(individualLesson.instructorName);
    if (instructorEmail) {
      const { subject, text, html } = buildInstructorIndividualLessonRegisteredEmail({
        instructorName: individualLesson.instructorName,
        lessonName: individualLesson.name,
        datetime: individualLesson.datetime,
        location: individualLesson.location ?? DEFAULT_LOCATION,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
    }
  } catch (mailError) {
    console.error("講師への新規個別レッスン登録通知メールの送信に失敗しました:", mailError);
  }

  return NextResponse.json({ individualLesson }, { status: 201 });
}
