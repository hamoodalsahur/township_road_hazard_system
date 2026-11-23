-- CreateTable
CREATE TABLE "road_closures" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "reportId" TEXT,
    "incidentId" TEXT,
    "category" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'LOCAL_DEMO_OPERATOR',
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_closure_roads" (
    "closureId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "wayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,

    CONSTRAINT "road_closure_roads_pkey" PRIMARY KEY ("closureId","wayId")
);

-- CreateIndex
CREATE INDEX "road_closures_areaId_endsAt_idx" ON "road_closures"("areaId", "endsAt");

-- CreateIndex
CREATE INDEX "road_closures_reportId_idx" ON "road_closures"("reportId");

-- CreateIndex
CREATE INDEX "road_closures_incidentId_idx" ON "road_closures"("incidentId");

-- CreateIndex
CREATE INDEX "road_closure_roads_areaId_wayId_idx" ON "road_closure_roads"("areaId", "wayId");

-- AddForeignKey
ALTER TABLE "road_closure_roads" ADD CONSTRAINT "road_closure_roads_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "road_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

