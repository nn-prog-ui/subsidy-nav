-- Phase 31: AI申請ガイド（コンサル納品物）
CREATE TABLE IF NOT EXISTS "ApplicationGuide" (
    "id" TEXT NOT NULL,
    "subsidyId" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "writingTips" TEXT[],
    "preparation" TEXT[],
    "schedule" TEXT[],
    "disbursementDays" INTEGER,
    "pitfalls" TEXT[],
    "model" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationGuide_subsidyId_key" ON "ApplicationGuide"("subsidyId");

ALTER TABLE "ApplicationGuide" ADD CONSTRAINT "ApplicationGuide_subsidyId_fkey"
    FOREIGN KEY ("subsidyId") REFERENCES "Subsidy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
