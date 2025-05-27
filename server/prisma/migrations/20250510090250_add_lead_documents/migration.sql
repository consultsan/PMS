-- CreateTable
CREATE TABLE "LeadDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
