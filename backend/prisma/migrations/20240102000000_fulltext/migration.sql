-- Add full-text search vector column
ALTER TABLE "Subsidy" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "Subsidy_searchVector_idx" ON "Subsidy" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION subsidy_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."targetType", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.prefecture, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subsidy_search_vector_trigger ON "Subsidy";
CREATE TRIGGER subsidy_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Subsidy"
  FOR EACH ROW EXECUTE FUNCTION subsidy_search_vector_update();

UPDATE "Subsidy" SET "searchVector" =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce("targetType", '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(prefecture, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'D');
