-- 申請難易度・所要日数フィールドを追加
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "difficulty" TEXT;
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "estimatedDays" INTEGER;
