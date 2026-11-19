/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `CommunityPost` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "CommunityPost" DROP COLUMN "imageUrl",
ADD COLUMN     "mediaType" "MediaType",
ADD COLUMN     "mediaUrl" TEXT;
