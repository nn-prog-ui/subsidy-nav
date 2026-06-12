-- Phase 10: 申請ステップ・必要書類・進捗トラッカー・監査ログ・解析イベント

-- 10A: 補助金に申請ステップ・必要書類
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "applicationSteps" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 10B: ユーザー申請進捗
CREATE TABLE IF NOT EXISTS "ApplicationProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subsidyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'considering',
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationProgress_userId_subsidyId_key" ON "ApplicationProgress"("userId", "subsidyId");
CREATE INDEX IF NOT EXISTS "ApplicationProgress_userId_idx" ON "ApplicationProgress"("userId");
DO $$ BEGIN
  ALTER TABLE "ApplicationProgress" ADD CONSTRAINT "ApplicationProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10C: 監査ログ
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "targetId" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- 10D: 解析イベント
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "subsidyId" TEXT,
  "keyword" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_subsidyId_idx" ON "AnalyticsEvent"("subsidyId");
