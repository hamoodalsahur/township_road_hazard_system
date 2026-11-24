-- CreateTable
CREATE TABLE "report_resolutions" (
    "reportId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,
    "resolvedBy" TEXT NOT NULL DEFAULT 'LOCAL_DEMO_OPERATOR',

    CONSTRAINT "report_resolutions_pkey" PRIMARY KEY ("reportId")
);
