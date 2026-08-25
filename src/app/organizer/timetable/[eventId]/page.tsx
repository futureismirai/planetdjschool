import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventEditor } from "./EventEditor";

export const dynamic = "force-dynamic";

async function getEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      days: {
        orderBy: [{ date: "asc" }, { order: "asc" }],
        include: {
          floors: {
            orderBy: { order: "asc" },
            include: { slots: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!event) return null;

  return {
    id: event.id,
    name: event.name,
    memo: event.memo,
    days: event.days.map((day) => ({
      id: day.id,
      date: day.date.toISOString().slice(0, 10),
      label: day.label,
      floors: day.floors.map((floor) => ({
        id: floor.id,
        name: floor.name,
        startTime: floor.startTime,
        endTime: floor.endTime,
        slots: floor.slots.map((slot) => ({
          id: slot.id,
          performerName: slot.performerName,
          snsHandle: slot.snsHandle,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isFixed: slot.isFixed,
        })),
      })),
    })),
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  return <EventEditor event={event} />;
}
