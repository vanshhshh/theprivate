-- Fuzzy search support (airports, operators). Not expressible in Prisma schema syntax.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Airport_searchText_trgm_idx" ON "Airport" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Operator_legalName_trgm_idx" ON "Operator" USING gin (lower("legalName") gin_trgm_ops);
