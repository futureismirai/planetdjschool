import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseLessonInput } from "@/lib/lessonInput";
import { sendMail } from "@/lib/mailer";
import { buildInstructorLessonRegisteredEmail } from "@/lib/emailTemplates";
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

  const parsed = parseLessonInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const lesson = await prisma.lesson.create({ data: parsed.data });

  try {
    const instructorEmail = await getInstructorEmailByName(lesson.instructorName);
    if (instructorEmail) {
      const { subject, text, html } = buildInstructorLessonRegisteredEmail({
        instructorName: lesson.instructorName,
        lessonName: lesson.name,
        datetime: lesson.datetime,
        location: lesson.location ?? DEFAULT_LOCATION,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
    }
  } catch (mailError) {
    console.error("講師への新規レッスン登録通知メールの送信に失敗しました:", mailError);
  }

  return NextResponse.json({ lesson }, { status: 201 });
}
