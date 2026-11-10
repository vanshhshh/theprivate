-- DropIndex
DROP INDEX "Airport_searchText_idx";

-- DropIndex
DROP INDEX "Operator_legalName_idx";

-- CreateIndex
CREATE INDEX "Operator_legalName_gin_idx" ON "Operator" USING GIN ("legalName" gin_trgm_ops);

-- Superseded by Operator_legalName_gin_idx (owned by the Prisma schema)
DROP INDEX IF EXISTS "Operator_legalName_trgm_idx";
