-- Phase 14C: 進捗リマインドのオプトアウト設定
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyProgress" BOOLEAN NOT NULL DEFAULT true;
