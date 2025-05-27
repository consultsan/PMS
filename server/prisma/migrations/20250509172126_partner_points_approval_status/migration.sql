-- CreateEnum
CREATE TYPE "PartnerPointsStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "PartnerPoints" ADD COLUMN     "approvalStatus" "PartnerPointsStatus" NOT NULL DEFAULT 'APPROVED';
