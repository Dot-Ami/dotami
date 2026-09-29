-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PersonStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "saidAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scenarioSeedKey" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "targetRevenueY1" INTEGER NOT NULL,
    "targetRevenueY3" INTEGER NOT NULL,
    "structure" TEXT NOT NULL DEFAULT 'sole-prop',
    "structureSource" TEXT NOT NULL DEFAULT 'assumed',
    "hireFirst" BOOLEAN NOT NULL DEFAULT false,
    "activityTags" JSONB NOT NULL DEFAULT '[]',
    "capitalPurchasePlanned" BOOLEAN NOT NULL DEFAULT false,
    "employmentStatus" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'IDEA',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Venture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VentureLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'RELATED',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VentureLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScenarioState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "activeNodeIds" JSONB NOT NULL,
    "completedNodeIds" JSONB NOT NULL,
    "ghostedNodeIds" JSONB NOT NULL,
    "activeBranches" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScenarioState_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PersonStatement_userId_saidAt_idx" ON "PersonStatement"("userId", "saidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_scenarioSeedKey_key" ON "Venture"("scenarioSeedKey");

-- CreateIndex
CREATE INDEX "Venture_userId_idx" ON "Venture"("userId");

-- CreateIndex
CREATE INDEX "VentureLink_toId_idx" ON "VentureLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "VentureLink_fromId_toId_key" ON "VentureLink"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioState_ventureId_key" ON "ScenarioState"("ventureId");

