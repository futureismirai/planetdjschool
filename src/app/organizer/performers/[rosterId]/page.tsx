import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RosterEditor } from "./RosterEditor";

export const dynamic = "force-dynamic";

async function getRoster(rosterId: string) {
  const roster = await prisma.performerRoster.findUnique({
    where: { id: rosterId },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  if (!roster) return null;
  return {
    id: roster.id,
    name: roster.name,
    entries: roster.entries.map((e) => ({ id: e.id, name: e.name, snsHandle: e.snsHandle })),
  };
}

export default async function PerformerRosterDetailPage({
  params,
}: {
  params: Promise<{ rosterId: string }>;
}) {
  const { rosterId } = await params;
  const roster = await getRoster(rosterId);
  if (!roster) notFound();

  return <RosterEditor roster={roster} />;
}
