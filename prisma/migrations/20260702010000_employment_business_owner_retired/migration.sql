-- Add "business-owner" and "retired" to EmploymentStatus (page-mechanics workshop, 2026-07-02).
-- Postgres requires each ALTER TYPE ... ADD VALUE in its own statement.
ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'BUSINESS_OWNER';
ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'RETIRED';
