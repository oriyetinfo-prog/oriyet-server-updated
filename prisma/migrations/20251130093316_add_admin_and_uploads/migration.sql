/*
  Warnings:

  - A unique constraint covering the columns `[website]` on the table `Speaker` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EmailVerification" ALTER COLUMN "sessionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "isEmailSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AdminVerification" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminVerification_email_key" ON "AdminVerification"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Speaker_website_key" ON "Speaker"("website");
