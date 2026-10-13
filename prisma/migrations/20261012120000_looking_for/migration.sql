-- The way in (2026-10-12; docs/architecture/future-cockpit.md § 1, The way in as built): the answer to
-- "a business of your own, a job or career, or both?" is kept on the future picked on Pick a future,
-- with the moment it was kept.
--
-- Hand-written: two plain ADD COLUMNs, both optional, so Venture is never copied, dropped or renamed (the
-- desktop migrator runs with foreign keys on, and a rebuild would cascade-delete every idea's figures,
-- links and map progress). The new EmploymentStatus value NOT_SAID needs no SQL: SQLite keeps an enum as
-- text.

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "lookingFor" TEXT;
ALTER TABLE "Venture" ADD COLUMN "lookingForSetAt" DATETIME;
