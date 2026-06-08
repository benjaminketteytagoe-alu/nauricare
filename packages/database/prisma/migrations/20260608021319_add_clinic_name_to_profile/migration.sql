/*
  Warnings:

  - Added the required column `clinicName` to the `PractitionerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PractitionerProfile" ADD COLUMN     "clinicName" TEXT NOT NULL;
