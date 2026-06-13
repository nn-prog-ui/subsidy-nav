-- Phase 13A: お気に入り公開共有用トークン
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_shareToken_key" ON "User"("shareToken");
