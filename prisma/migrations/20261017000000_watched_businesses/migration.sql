-- Businesses you're watching (2026-10-17; docs/architecture/competitive-landscape.md § 6.2 item 5, § 7): the
-- person's own list for an idea, under "Others in this line of work" in the cockpit. Each row is a name as the
-- person typed it, an optional link, their note, and the ads they saw with the day seen (a JSON list).
--
-- One new table and its index, as Prisma's diff writes them (read 2026-10-17: a CREATE TABLE and a CREATE
-- INDEX, nothing else; Venture only gains a relation field, which is no column). Venture is never copied,
-- dropped or renamed: the desktop migrator runs with foreign keys on, and a rebuild would cascade-delete every
-- idea's figures, links and map progress. The list is deleted with its idea (ON DELETE CASCADE).

-- CreateTable
CREATE TABLE "WatchedBusiness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "nameAsTyped" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "adLinks" JSONB NOT NULL DEFAULT '[]',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchedBusiness_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WatchedBusiness_ventureId_idx" ON "WatchedBusiness"("ventureId");
