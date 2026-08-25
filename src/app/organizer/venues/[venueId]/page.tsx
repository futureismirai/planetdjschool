import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VenueEditor } from "./VenueEditor";

export const dynamic = "force-dynamic";

async function getVenue(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { photos: { orderBy: { order: "asc" } } },
  });
  if (!venue) return null;
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    access: venue.access,
    conditions: venue.conditions,
    equipment: venue.equipment,
    notes: venue.notes,
    photos: venue.photos.map((p) => ({ id: p.id, dataUrl: p.dataUrl, caption: p.caption })),
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = await params;
  const venue = await getVenue(venueId);
  if (!venue) notFound();

  return <VenueEditor venue={venue} />;
}
