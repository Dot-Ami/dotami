-- S2.5.4a "Get to know about me first" (2026-09-13): dated, verbatim, append-only statements
-- the person made about themselves. No UPDATE/DELETE path by design (charter: never
-- summarised, newer supersedes by date). Vault rows are read live from disk, never stored.
CREATE TABLE "PersonStatement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "saidAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonStatement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonStatement_userId_saidAt_idx" ON "PersonStatement"("userId", "saidAt");

ALTER TABLE "PersonStatement" ADD CONSTRAINT "PersonStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
