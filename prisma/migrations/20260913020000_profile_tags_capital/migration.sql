-- S2.5.4e (2026-09-13): keep what the person confirmed on intake (activity tags, capital-purchase
-- toggle) on the venture, so the cockpit can run the same evaluator the intake preview runs.
ALTER TABLE "Venture" ADD COLUMN "activityTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Venture" ADD COLUMN "capitalPurchasePlanned" BOOLEAN NOT NULL DEFAULT false;
