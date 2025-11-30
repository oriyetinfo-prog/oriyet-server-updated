-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "speakerId" INTEGER;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
