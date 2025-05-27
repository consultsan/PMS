-- CreateTable
CREATE TABLE "PartnerPoints" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPoints_partnerId_status_key" ON "PartnerPoints"("partnerId", "status");

-- AddForeignKey
ALTER TABLE "PartnerPoints" ADD CONSTRAINT "PartnerPoints_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
