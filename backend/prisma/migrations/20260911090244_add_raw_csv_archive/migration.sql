-- CreateTable
CREATE TABLE "RawCsvArchive" (
    "date" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawCsvArchive_pkey" PRIMARY KEY ("date")
);
