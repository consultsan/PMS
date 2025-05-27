-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "salesPersonId" TEXT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
