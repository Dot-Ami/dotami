-- CreateTable
CREATE TABLE "Figure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "sourceKind" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceRows" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "editedByPerson" BOOLEAN NOT NULL DEFAULT false,
    "proposedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "retractedAt" DATETIME,
    CONSTRAINT "Figure_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Figure_ventureId_status_idx" ON "Figure"("ventureId", "status");
