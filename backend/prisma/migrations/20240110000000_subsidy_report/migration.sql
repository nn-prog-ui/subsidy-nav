-- Phase 20A: 補助金の情報誤り報告
CREATE TABLE IF NOT EXISTS "SubsidyReport" (
  "id" TEXT NOT NULL,
  "subsidyId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "detail" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubsidyReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SubsidyReport_status_createdAt_idx" ON "SubsidyReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SubsidyReport_subsidyId_idx" ON "SubsidyReport"("subsidyId");
