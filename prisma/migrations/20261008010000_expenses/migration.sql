-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "paidTo" TEXT NOT NULL,
    "whatFor" TEXT NOT NULL,
    "category" TEXT,
    "sellerAddress" TEXT,
    "vendorGstNumber" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "editedByPerson" BOOLEAN NOT NULL DEFAULT false,
    "proposedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreedAt" DATETIME,
    "retractedAt" DATETIME,
    CONSTRAINT "Expense_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Expense_ventureId_status_idx" ON "Expense"("ventureId", "status");
