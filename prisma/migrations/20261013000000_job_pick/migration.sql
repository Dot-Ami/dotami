-- The job the person picks as closest to the work they'd do themselves, for the government's skills list
-- (2026-10-12; docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your pick of
-- job, as built"): an OaSIS profile code and the moment it was picked, kept on the idea.
--
-- Hand-written. Two plain ADD COLUMNs, both optional: Venture is never copied, dropped or renamed (the
-- desktop migrator runs with foreign keys on, and a rebuild would cascade-delete every idea's figures,
-- links and map progress). Ideas saved before this have no job picked.

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "occupationCode" TEXT;
ALTER TABLE "Venture" ADD COLUMN "occupationPickedAt" DATETIME;
