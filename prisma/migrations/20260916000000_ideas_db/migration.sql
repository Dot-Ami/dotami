-- S2.5.4i (2026-09-16): the ideas DB. Additive only.
-- maintainer ruling, 2026-09-14: \"each of my business ideas need to be labelled, saved and stored, and be able
-- to potentiall work with each other ... cross reference each idea."

-- CreateEnum
CREATE TYPE "VentureStage" AS ENUM ('IDEA', 'PROTOTYPE', 'FIRST_CUSTOMERS', 'ESTABLISHED');

-- CreateEnum
CREATE TYPE "VentureLinkKind" AS ENUM ('SISTER', 'OVERLAPS', 'FEEDS', 'RELATED');

-- AlterTable
ALTER TABLE "Venture" ADD COLUMN "stage" "VentureStage" NOT NULL DEFAULT 'IDEA',
ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "VentureLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" "VentureLinkKind" NOT NULL DEFAULT 'RELATED',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VentureLink_fromId_toId_key" ON "VentureLink"("fromId", "toId");

-- CreateIndex
CREATE INDEX "VentureLink_toId_idx" ON "VentureLink"("toId");

-- AddForeignKey
ALTER TABLE "VentureLink" ADD CONSTRAINT "VentureLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureLink" ADD CONSTRAINT "VentureLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
