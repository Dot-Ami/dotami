-- [8f] Each figure can remember the tax year a T2125 total is for, and the form and line it was
-- read from. Two plain ADD COLUMNs, both optional, so every existing figure keeps its row as it was
-- (null in both) and the table is never copied, dropped or renamed: the desktop migrator runs with
-- foreign keys on, and a rebuild of a table that Venture's cascades touch could delete data.

-- AlterTable
ALTER TABLE "Figure" ADD COLUMN "formLine" TEXT;
ALTER TABLE "Figure" ADD COLUMN "taxYear" INTEGER;
