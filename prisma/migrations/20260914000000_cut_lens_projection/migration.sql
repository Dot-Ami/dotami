-- S2.5.4h (2026-09-14): the Lens chat and the five-year projection are removed. In-app AI is
-- off by design (a coding agent working with the person is the reasoner), so their rows are
-- not needed. The pre-cut code is not in this repository.

-- DropForeignKey
ALTER TABLE "LensMessage" DROP CONSTRAINT "LensMessage_ventureId_fkey";

-- DropTable
DROP TABLE "LensMessage";

-- DropEnum
DROP TYPE "ChatRole";

-- DropEnum
DROP TYPE "LensMode";

-- AlterTable: the projection Json held numbers computed from invented growth constants.
ALTER TABLE "ScenarioState" DROP COLUMN "projection";
