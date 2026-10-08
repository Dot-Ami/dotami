-- [8i] Typed expense records, the maintainer's decisions (2026-10-08): a record's idea becomes optional
-- ("not attached yet", attached later), and a record gains the person's own business share, a refund's
-- link to the expense it came from, the GST/HST part and a credit note's details.
--
-- Hand-checked, from the SQL `prisma migrate diff` printed for this schema, with Prisma's PRAGMA lines
-- taken out. SQLite can't make a column nullable in place, so the Expense table is rebuilt (new table,
-- copy, drop, rename). ONLY Expense is rebuilt: nothing here creates, copies, drops or renames Venture,
-- Figure, VentureLink, ScenarioState, Setting or any other table (tests/desktop-migrate.spec.ts checks
-- every statement). The desktop migrator applies this inside one transaction with foreign keys on, where
-- `PRAGMA foreign_keys=OFF` does nothing; leaving the PRAGMAs out makes `prisma migrate deploy` run it the
-- same way. With foreign keys on, dropping the old Expense deletes its rows first: no table has Expense
-- as its parent except the new copy, whose refundOfId is still empty, so nothing else is touched.

CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT,
    "date" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "paidTo" TEXT NOT NULL,
    "whatFor" TEXT NOT NULL,
    "category" TEXT,
    "sellerAddress" TEXT,
    "vendorGstNumber" TEXT,
    "recordKind" TEXT NOT NULL DEFAULT 'expense',
    "refundOfId" TEXT,
    "gstHstCents" BIGINT,
    "creditNote" TEXT,
    "businessSharePercent" INTEGER,
    "sourceKind" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "editedByPerson" BOOLEAN NOT NULL DEFAULT false,
    "proposedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreedAt" DATETIME,
    "retractedAt" DATETIME,
    CONSTRAINT "Expense_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("agreedAt", "amountCents", "category", "currency", "date", "editedByPerson", "id", "paidTo", "proposedAt", "retractedAt", "sellerAddress", "sourceKind", "sourceLabel", "status", "vendorGstNumber", "ventureId", "whatFor") SELECT "agreedAt", "amountCents", "category", "currency", "date", "editedByPerson", "id", "paidTo", "proposedAt", "retractedAt", "sellerAddress", "sourceKind", "sourceLabel", "status", "vendorGstNumber", "ventureId", "whatFor" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_ventureId_status_idx" ON "Expense"("ventureId", "status");
CREATE INDEX "Expense_refundOfId_idx" ON "Expense"("refundOfId");
