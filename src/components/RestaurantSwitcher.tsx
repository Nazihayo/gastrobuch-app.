"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchRestaurant } from "@/app/actions";

export default function RestaurantSwitcher({
  currentId,
  currentName,
  restaurants,
}: {
  currentId: string;
  currentName: string;
  restaurants: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (restaurants.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-display text-xl font-bold">{currentName}</span>
        <Link
          href="/restaurants/new"
          aria-label="add restaurant"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-divider text-sm text-text-on-ink-dim"
        >
          +
        </Link>
      </div>
    );
  }

  return (
    <select
      value={currentId}
      onChange={(e) => {
        const id = e.target.value;
        if (id === "__new__") {
          router.push("/restaurants/new");
          return;
        }
        startTransition(() => {
          switchRestaurant(id);
        });
      }}
      className="min-h-11 max-w-[60vw] rounded-lg border border-divider bg-ink-soft px-2 font-display text-lg font-bold"
    >
      {restaurants.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
      <option value="__new__">+ …</option>
    </select>
  );
}
