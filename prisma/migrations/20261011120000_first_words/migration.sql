-- The sentence typed on the front door is kept with the idea (2026-10-11): it is one of the person's
-- statements, linked to the idea it was typed for, and the goal chips picked on the intake go on the
-- idea. Hand-written, as two plain ADD COLUMNs. Prisma's own diff for this change "redefines" both
-- tables (new table, copy, drop, rename); the desktop migrator runs with foreign keys on, so dropping
-- Venture that way would cascade-delete every idea's figures, links and map progress.
-- A column added with REFERENCES must default to NULL, which an optional link does.

-- AlterTable
ALTER TABLE "PersonStatement" ADD COLUMN "ventureId" TEXT REFERENCES "Venture" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "goals" JSONB NOT NULL DEFAULT '[]';
