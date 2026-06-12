-- 日本語検索の高速化: pg_trgm 拡張とトライグラムGINインデックス
-- ('simple' tsvector は日本語を分かち書きできないため、ILIKE検索を高速化する)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "subsidy_title_trgm" ON "Subsidy" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "subsidy_description_trgm" ON "Subsidy" USING gin ("description" gin_trgm_ops);
