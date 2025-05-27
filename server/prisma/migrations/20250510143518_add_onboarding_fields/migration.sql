/*
  Warnings:

  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ONBOARDING',
ALTER COLUMN "isActive" SET DEFAULT false,
ALTER COLUMN "phone" SET NOT NULL;
