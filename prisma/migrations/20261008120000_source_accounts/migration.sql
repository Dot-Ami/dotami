-- CreateTable
CREATE TABLE "SourceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "allowance" TEXT NOT NULL,
    "agreedAt" DATETIME NOT NULL,
    "retiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
