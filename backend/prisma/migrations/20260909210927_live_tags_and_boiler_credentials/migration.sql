-- AlterTable
ALTER TABLE "BoilerConnection" ADD COLUMN     "encryptedPassword" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "LiveTag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "writable" BOOLEAN NOT NULL DEFAULT false,
    "divisor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveTag_key_key" ON "LiveTag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LiveTag_tag_key" ON "LiveTag"("tag");

