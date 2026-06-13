-- Phase 11D: 補助金の変更履歴
CREATE TABLE IF NOT EXISTS "SubsidyRevision" (
  "id" TEXT NOT NULL,
  "subsidyId" TEXT NOT NULL,
  "adminEmail" TEXT,
  "changes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubsidyRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SubsidyRevision_subsidyId_idx" ON "SubsidyRevision"("subsidyId");
CREATE INDEX IF NOT EXISTS "SubsidyRevision_createdAt_idx" ON "SubsidyRevision"("createdAt");
