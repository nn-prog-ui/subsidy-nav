-- Phase 22A: 累計閲覧数
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Subsidy_viewCount_idx" ON "Subsidy"("viewCount");
