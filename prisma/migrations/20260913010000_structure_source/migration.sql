-- S2.5.4d (2026-09-13): record whether the venture structure was set by the person or assumed by
-- the map. Existing rows default to "assumed" - the honest read, since no UI ever let anyone set it.
ALTER TABLE "Venture" ADD COLUMN "structureSource" TEXT NOT NULL DEFAULT 'assumed';
