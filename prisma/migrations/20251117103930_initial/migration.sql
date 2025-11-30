-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('Zoom', 'GoogleMeet', 'MicrosoftTeams', 'Offline', 'Others');

-- CreateTable
CREATE TABLE "Speaker" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "website" TEXT DEFAULT '',

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "speakerId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "registrationFee" INTEGER NOT NULL DEFAULT 0,
    "seats" INTEGER NOT NULL,
    "platform" "Platform" NOT NULL,
    "meetingLink" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_slug_key" ON "Session"("slug");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
