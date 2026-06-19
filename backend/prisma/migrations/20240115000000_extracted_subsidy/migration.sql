-- Phase 32: AI抽出した補助金候補（管理者レビュー用）
CREATE TABLE IF NOT EXISTS "ExtractedSubsidy" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "municipalityName" TEXT,
    "level" TEXT NOT NULL DEFAULT '市区町村',
    "maxAmount" BIGINT,
    "subsidyRate" TEXT,
    "applicationStart" TIMESTAMP(3),
    "applicationEnd" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishedId" TEXT,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractedSubsidy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExtractedSubsidy_status_createdAt_idx" ON "ExtractedSubsidy"("status", "createdAt");
