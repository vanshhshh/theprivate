-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN     "acceptedById" TEXT,
ADD COLUMN     "acceptedIp" TEXT,
ADD COLUMN     "acceptedName" TEXT;

-- AlterTable
ALTER TABLE "Airport" ADD COLUMN     "searchRank" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Country" ALTER COLUMN "currency" DROP NOT NULL;
