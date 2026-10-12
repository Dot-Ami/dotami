-- Phase 1 of the future cockpit keeps what the person tells it (2026-10-11;
-- docs/architecture/future-cockpit.md § 7, Storage as built): skill marks for the person, progress on
-- each step of a future's road, numbers that belong to the person (the yearly income they want), the
-- future's road, endings and month, the destination as a kind of statement, and what a start-up cost
-- line prices.
--
-- Hand-written. Prisma's own diff for this change "redefines" Venture (new table, copy, drop, rename);
-- the desktop migrator runs with foreign keys on, so dropping Venture that way would cascade-delete every
-- idea's figures, links and map progress. Here Venture, PersonStatement and Figure only gain columns
-- through plain ADD COLUMNs (each optional, or with a default), and the three new tables are created as
-- Prisma would create them. No table is copied, dropped or renamed.

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "roadId" TEXT;
ALTER TABLE "Venture" ADD COLUMN "forkPicks" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Venture" ADD COLUMN "targetMonth" TEXT;

-- AlterTable
ALTER TABLE "PersonStatement" ADD COLUMN "kind" TEXT;

-- AlterTable
ALTER TABLE "Figure" ADD COLUMN "amountFrom" TEXT;
ALTER TABLE "Figure" ADD COLUMN "costLineId" TEXT;
ALTER TABLE "Figure" ADD COLUMN "roadId" TEXT;
ALTER TABLE "Figure" ADD COLUMN "roadStepId" TEXT;

-- CreateTable
CREATE TABLE "SkillMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "skillItemId" TEXT,
    "ownLabel" TEXT,
    "mark" TEXT NOT NULL,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" TEXT,
    "doneWhenIds" JSONB NOT NULL DEFAULT '[]',
    "changes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StepProgress_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonFigure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "per" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "editedByPerson" BOOLEAN NOT NULL DEFAULT false,
    "proposedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "retractedAt" DATETIME,
    CONSTRAINT "PersonFigure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillMark_userId_skillItemId_key" ON "SkillMark"("userId", "skillItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillMark_userId_ownLabel_key" ON "SkillMark"("userId", "ownLabel");

-- CreateIndex
CREATE UNIQUE INDEX "StepProgress_ventureId_roadId_stepId_key" ON "StepProgress"("ventureId", "roadId", "stepId");

-- CreateIndex
CREATE INDEX "PersonFigure_userId_kind_status_idx" ON "PersonFigure"("userId", "kind", "status");
