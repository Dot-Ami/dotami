"use client";

import { useEffect, useState } from "react";

import { PLACES, type PlaceId } from "./demo/world";

/**
 * The person's rough place, kept only in this browser (localStorage) and never sent anywhere. It
 * changes which affected groups and actions a page shows first, nothing else. Storage can be
 * unavailable (private windows, blocked site data), so every read and write is guarded and the
 * pages work without it.
 */
const KEY = "civic-trace:place";
const EVENT = "civic-trace:place-changed";

export function readPlace(): PlaceId | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return PLACES.some((p) => p.id === value) ? (value as PlaceId) : null;
  } catch {
    return null;
  }
}

export function writePlace(place: PlaceId | null) {
  try {
    if (place) window.localStorage.setItem(KEY, place);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do: the choice just won't be remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function usePlace(): PlaceId | null {
  const [place, setPlace] = useState<PlaceId | null>(null);
  useEffect(() => {
    const update = () => setPlace(readPlace());
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);
  return place;
}
