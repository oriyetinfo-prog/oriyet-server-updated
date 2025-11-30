/*
  Warnings:

  - You are about to drop the column `speakerId` on the `Session` table. All the data in the column will be lost.
  - Changed the type of `platform` on the `Session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_speakerId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "speakerId",
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Platform";
