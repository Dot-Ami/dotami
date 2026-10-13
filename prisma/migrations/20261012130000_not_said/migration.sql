-- The way in (2026-10-12; docs/architecture/future-cockpit.md § 1, The way in as built): a future picked
-- on Pick a future is saved without the kind of venture, equipment or sales targets, because nobody is
-- asked them on that way in. This list names them, so nothing reads the intake's starting values in their
-- columns as the person's answers.
--
-- Hand-written: one plain ADD COLUMN with a default, so Venture is never copied, dropped or renamed (the
-- desktop migrator runs with foreign keys on, and a rebuild would cascade-delete every idea's figures,
-- links and map progress). Every idea saved before reads as [] (nothing not said).

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "notSaid" JSONB NOT NULL DEFAULT '[]';
