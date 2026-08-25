"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fileToResizedDataUrl } from "@/lib/image";

export type VenueData = {
  id: string;
  name: string;
  address: string | null;
  access: string | null;
  conditions: string | null;
  equipment: string | null;
  notes: string | null;
  photos: { id: string; dataUrl: string; caption: string | null }[];
};

const FIELDS: { key: keyof Pick<VenueData, "address" | "access" | "conditions" | "equipment" | "notes">; label: string; placeholder: string }[] = [
  { key: "address", label: "住所", placeholder: "例: 東京都渋谷区〇〇 1-2-3" },
  { key: "access", label: "アクセス", placeholder: "例: 渋谷駅から徒歩5分" },
  { key: "conditions", label: "開催条件", placeholder: "例: 搬入は当日15時〜、終演23時厳守 など" },
  { key: "equipment", label: "機材情報", placeholder: "例: PIONEER DJM-A9 / CDJ-3000 x2 など" },
  { key: "notes", label: "場所の注意事項", placeholder: "例: 近隣への騒音配慮、搬入口の場所 など" },
];

function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState("コピー");

  async function handleCopy() {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setLabel("コピーしました！");
    } catch {
      setLabel("コピー失敗");
    } finally {
      setTimeout(() => setLabel("コピー"), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text.trim()}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function TextField({
  venue,
  fieldKey,
  label,
  placeholder,
  onSaved,
}: {
  venue: VenueData;
  fieldKey: keyof VenueData;
  label: string;
  placeholder: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState((venue[fieldKey] as string | null) ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    setError(null);
    const res = await fetch(`/api/organizer/venues/${venue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: venue.name,
        address: venue.address,
        access: venue.access,
        conditions: venue.conditions,
        equipment: venue.equipment,
        notes: venue.notes,
        [fieldKey]: value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました。");
      return;
    }
    onSaved();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        <CopyButton text={value} />
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function PhotoGallery({ venue, onSaved }: { venue: VenueData; onSaved: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToResizedDataUrl(file);
        const res = await fetch(`/api/organizer/venues/${venue.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "アップロードに失敗しました。");
          break;
        }
      }
      onSaved();
    } catch {
      setError("画像の処理に失敗しました。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!window.confirm("この写真を削除しますか？")) return;
    const res = await fetch(`/api/organizer/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) onSaved();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-600">宣材写真</h3>
        <label className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
          {uploading ? "アップロード中..." : "＋ 写真を追加"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {venue.photos.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">写真はまだありません。</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {venue.photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-md border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.dataUrl} alt={photo.caption ?? venue.name} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute right-1 top-1 rounded-md bg-white/90 px-2 py-0.5 text-xs text-rose-600 opacity-0 shadow-sm transition group-hover:opacity-100"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VenueEditor({ venue }: { venue: VenueData }) {
  const router = useRouter();
  const [name, setName] = useState(venue.name);
  const [deleting, setDeleting] = useState(false);

  async function handleNameBlur() {
    if (!name.trim()) {
      setName(venue.name);
      return;
    }
    await fetch(`/api/organizer/venues/${venue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...venue, name }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`会場「${venue.name}」を削除しますか？写真も含めすべて削除されます。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/venues/${venue.id}`, { method: "DELETE" });
      if (res.ok) router.push("/organizer/venues");
    } finally {
      setDeleting(false);
    }
  }

  const allFieldsText = [
    `【${name}】`,
    venue.address ? `住所: ${venue.address}` : null,
    venue.access ? `アクセス: ${venue.access}` : null,
    venue.conditions ? `開催条件: ${venue.conditions}` : null,
    venue.equipment ? `機材情報: ${venue.equipment}` : null,
    venue.notes ? `注意事項: ${venue.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href="/organizer/venues" className="text-xs text-slate-400 hover:text-slate-600">
            ← 会場一覧に戻る
          </Link>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            className="mt-1 w-full rounded-md border border-transparent px-1 text-xl font-bold text-slate-900 hover:border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <CopyButton text={allFieldsText} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            会場を削除
          </button>
        </div>
      </div>

      <PhotoGallery venue={venue} onSaved={() => router.refresh()} />

      <div className="space-y-3">
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            venue={venue}
            fieldKey={f.key}
            label={f.label}
            placeholder={f.placeholder}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}
