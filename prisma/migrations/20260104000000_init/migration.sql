-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VentureType" AS ENUM ('SERVICE', 'PRODUCT', 'SIDE_GIG');

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('AB', 'BC', 'ON');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYEE', 'APPRENTICE', 'SELF_EMPLOYED', 'UNEMPLOYED', 'OTHER');

-- CreateEnum
CREATE TYPE "LensMode" AS ENUM ('TAX', 'LEGAL', 'OPERATOR', 'COMPARE');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioSeedKey" TEXT,
    "name" TEXT NOT NULL,
    "type" "VentureType" NOT NULL,
    "province" "Province" NOT NULL,
    "targetRevenueY1" INTEGER NOT NULL,
    "targetRevenueY3" INTEGER NOT NULL,
    "structure" TEXT NOT NULL DEFAULT 'sole-prop',
    "hireFirst" BOOLEAN NOT NULL DEFAULT false,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioState" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "activeNodeIds" TEXT[],
    "completedNodeIds" TEXT[],
    "ghostedNodeIds" TEXT[],
    "activeBranches" JSONB NOT NULL,
    "projection" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LensMessage" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "lensMode" "LensMode" NOT NULL,
    "content" TEXT NOT NULL,
    "contextNode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LensMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_scenarioSeedKey_key" ON "Venture"("scenarioSeedKey");

-- CreateIndex
CREATE INDEX "Venture_userId_idx" ON "Venture"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioState_ventureId_key" ON "ScenarioState"("ventureId");

-- CreateIndex
CREATE INDEX "LensMessage_ventureId_createdAt_idx" ON "LensMessage"("ventureId", "createdAt");

-- AddForeignKey
ALTER TABLE "Venture" ADD CONSTRAINT "Venture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioState" ADD CONSTRAINT "ScenarioState_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensMessage" ADD CONSTRAINT "LensMessage_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
