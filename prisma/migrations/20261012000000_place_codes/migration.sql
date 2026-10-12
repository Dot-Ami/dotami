-- Places stored as international codes (the maintainer's decision of 2026-10-11;
-- docs/architecture/future-cockpit.md § 7, Storage as built): each idea's province becomes its code from
-- ISO 3166-2:CA, so "AB" is written "CA-AB". The Prisma enum Province keeps its names and maps each one to
-- its code (prisma/schema.prisma), so the app reads AB exactly as before.
--
-- Hand-written. One UPDATE of one column: nothing is copied, dropped or renamed, so no idea's figures,
-- links or map progress can be touched. Only a value that is still two letters is rewritten, so a value
-- that is already a code is never written as "CA-CA-AB".

-- UpdateData
UPDATE "Venture" SET "province" = 'CA-' || "province" WHERE length("province") = 2;
