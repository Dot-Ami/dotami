"use client";

import { PLACES, type PlaceId } from "@/lib/demo/world";
import { usePlace, writePlace } from "@/lib/place";

export function PlacePicker() {
  const place = usePlace();
  return (
    <div className="rounded border border-line bg-card p-4">
      <label htmlFor="place" className="block font-semibold">
        Where are you? <span className="font-normal text-muted">(optional)</span>
      </label>
      <p id="place-help" className="text-sm text-muted">
        Pick the closest description. No address needed. It stays in this browser and only changes
        what each page shows first.
      </p>
      <select
        id="place"
        aria-describedby="place-help"
        className="mt-2 w-full rounded border border-line bg-paper p-2 sm:w-auto"
        value={place ?? ""}
        onChange={(e) => writePlace((e.target.value || null) as PlaceId | null)}
      >
        <option value="">Not set</option>
        {PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
