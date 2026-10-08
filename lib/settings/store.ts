import type { PrismaClient } from "@prisma/client";

import { SETTINGS } from "./catalog";
import {
  SETTING_DEFINITIONS,
  isLiveSettingId,
  valueFromStored,
  type LiveSettingId,
  type SettingDefinition,
  type SettingValues,
} from "./values";

/**
 * The database side of saved settings: one `Setting` row per setting, its key a settings-catalog
 * id and its value the setting's JSON text (prisma/schema.prisma). What a value may look like is
 * decided in ./values.ts; this file only refuses what that file refuses and keeps the rest.
 *
 * Only a setting the catalog marks `live` can be read or written. An id the catalog doesn't know,
 * or one whose story isn't built, is refused — the same rule the settings page follows when it
 * offers no control for it.
 */

/** The caller named a setting that can't be saved, or sent a value it can't hold. The route answers 400. */
export class SettingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingInputError";
  }
}

/** Throws unless `id` is a setting the catalog marks live and ./values.ts knows how to check. */
function requireLive(id: unknown): LiveSettingId {
  const catalogLive = SETTINGS.some((s) => s.id === id && s.status === "live");
  if (!catalogLive || !isLiveSettingId(id)) {
    throw new SettingInputError("That isn't a setting DotAmi can save.");
  }
  return id;
}

/** A setting's value now: what was saved, or its fallback when nothing has been. */
export async function readSetting<K extends LiveSettingId>(prisma: PrismaClient, id: K): Promise<SettingValues[K]> {
  requireLive(id);
  const row = await prisma.setting.findUnique({ where: { key: id } });
  return valueFromStored(id, row?.value ?? null);
}

/**
 * Saves a patch: the keys it names change, the rest of the setting keeps its value. Read, merge
 * and write happen in one transaction so two saves landing together (the settings page and the
 * ideas page, say) can't each start from the same old value and lose the other's change.
 * Returns the whole value as it now stands.
 */
export async function writeSetting<K extends LiveSettingId>(
  prisma: PrismaClient,
  id: K,
  patch: unknown,
): Promise<SettingValues[K]> {
  requireLive(id);
  const def = SETTING_DEFINITIONS[id] as SettingDefinition<SettingValues[K]>;
  const checked = def.parsePatch(patch);
  if (checked === null) throw new SettingInputError("That value isn't one this setting accepts.");

  return prisma.$transaction(async (tx) => {
    const row = await tx.setting.findUnique({ where: { key: id } });
    const next = { ...valueFromStored(id, row?.value ?? null), ...checked };
    const value = JSON.stringify(next);
    await tx.setting.upsert({ where: { key: id }, create: { key: id, value }, update: { value } });
    return next;
  });
}
