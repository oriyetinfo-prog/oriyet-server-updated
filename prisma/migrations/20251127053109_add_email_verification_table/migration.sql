-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "code" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_email_key" ON "EmailVerification"("email");
