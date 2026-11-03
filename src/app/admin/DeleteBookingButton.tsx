"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteWithEmailButton } from "./DeleteWithEmailButton";

export function DeleteBookingButton({
  bookingId,
  studentName,
}: {
  bookingId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(sendEmail: boolean) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}?notify=${sendEmail}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      window.alert("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DeleteWithEmailButton
      confirmMessage={`「${studentName}」さんの予約を本当に削除しますか？`}
      deleting={deleting}
      onConfirm={handleDelete}
    />
  );
}
