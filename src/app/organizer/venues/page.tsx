import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewVenueForm } from "./NewVenueForm";

export const dynamic = "force-dynamic";

async function getVenues() {
  return prisma.venue.findMany({
    orderBy: { updatedAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });
}

export default async function VenueListPage() {
  const venues = await getVenues();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">会場情報</h1>
        <p className="mt-1 text-sm text-slate-500">
          会場ごとに開催条件・機材情報・住所やアクセス・宣材写真・注意事項を保存して、いつでも確認・共有できます。
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <NewVenueForm />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {venues.length === 0 && <p className="text-sm text-slate-500">会場がまだ登録されていません。</p>}
        {venues.map((venue) => (
          <Link
            key={venue.id}
            href={`/organizer/venues/${venue.id}`}
            className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow"
          >
            {venue.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={venue.photos[0].dataUrl}
                alt={venue.name}
                className="h-20 w-20 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                写真なし
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">{venue.name}</h2>
              {venue.address && <p className="mt-0.5 truncate text-xs text-slate-500">{venue.address}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
