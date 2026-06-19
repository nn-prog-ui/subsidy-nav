-- Phase 30A: 取り込み元の記録（公式API連携の再取り込みupsert用）
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Subsidy_sourceId_key" ON "Subsidy"("sourceId");
