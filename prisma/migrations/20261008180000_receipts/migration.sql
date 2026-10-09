-- [8i] Receipts: the maintainer's decisions (2026-10-07 and 2026-10-08) keep a copy of each receipt
-- file the person adds in a receipts/ folder beside the data file, named by DotAmi with a random id.
-- This table only describes those files: which record each belongs to, the type DotAmi read from its
-- bytes, its size and its SHA-256. The file's bytes are never stored here.
--
-- Hand-checked, from the SQL `prisma migrate diff` printed for this schema (nothing taken out): one
-- CREATE TABLE and its unique index. Nothing here creates, copies, drops, renames or alters Venture,
-- Expense or any other table, so the desktop migrator (foreign keys on) can't cascade anything
-- (tests/desktop-migrate.spec.ts checks every statement and that seeded data survives).
-- Deleting an expense record deletes its Receipt row (ON DELETE CASCADE); deleting an idea keeps the
-- record (ON DELETE SET NULL on Expense.ventureId), so its receipt stays with it.

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_expenseId_key" ON "Receipt"("expenseId");
