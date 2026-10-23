-- Where you are (2026-10-22; docs/ui-spec/futures/02-where-you-are.md, tasks 23g and 25e): the answers to "Which
-- area are you in?" and "Which region are you in?", asked once on Pick a future right after the job pick, each
-- kept on the idea with the moment it was kept.
--
-- Hand-written. Four plain ADD COLUMNs, all optional: Venture is never copied, dropped or renamed (the desktop
-- migrator runs with foreign keys on, and a rebuild would cascade-delete every idea's figures, links and map
-- progress). Ideas saved before this have neither answer.

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "landscapeArea" TEXT;
ALTER TABLE "Venture" ADD COLUMN "landscapeAreaSetAt" DATETIME;
ALTER TABLE "Venture" ADD COLUMN "economicRegion" TEXT;
ALTER TABLE "Venture" ADD COLUMN "economicRegionSetAt" DATETIME;
