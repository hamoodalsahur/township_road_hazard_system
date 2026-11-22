-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "sourceUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "township_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coordinateSystem" TEXT NOT NULL DEFAULT 'schematic_xy',
    "boundaryJson" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "township_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_nodes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT NOT NULL,
    "isGateway" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_segments" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "corridorType" TEXT NOT NULL,
    "lengthUnits" DOUBLE PRECISION NOT NULL,
    "currentStatus" TEXT NOT NULL DEFAULT 'unknown',
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "statusUpdatedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "road_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_status_events" (
    "id" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" TEXT,
    "reason" TEXT NOT NULL,
    "sourceMode" TEXT NOT NULL,
    "actorId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "road_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_runs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "scenario_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flood_reports" (
    "id" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',

    CONSTRAINT "flood_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazard_reports" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "impact" TEXT NOT NULL,
    "reviewState" TEXT NOT NULL DEFAULT 'unverified',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazard_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "base64Data" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'private_unreviewed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'under_review',
    "reviewNote" TEXT NOT NULL,
    "possibleRoad" TEXT,
    "sourceMode" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_report_links" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_report_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "township_zones_sourceId_idx" ON "township_zones"("sourceId");

-- CreateIndex
CREATE INDEX "graph_nodes_zoneId_idx" ON "graph_nodes"("zoneId");

-- CreateIndex
CREATE INDEX "graph_nodes_sourceId_idx" ON "graph_nodes"("sourceId");

-- CreateIndex
CREATE INDEX "road_segments_zoneId_idx" ON "road_segments"("zoneId");

-- CreateIndex
CREATE INDEX "road_segments_fromNodeId_idx" ON "road_segments"("fromNodeId");

-- CreateIndex
CREATE INDEX "road_segments_toNodeId_idx" ON "road_segments"("toNodeId");

-- CreateIndex
CREATE INDEX "road_status_events_roadId_observedAt_idx" ON "road_status_events"("roadId", "observedAt");

-- CreateIndex
CREATE INDEX "flood_reports_status_createdAt_idx" ON "flood_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "flood_reports_roadId_idx" ON "flood_reports"("roadId");

-- CreateIndex
CREATE INDEX "audit_entries_createdAt_idx" ON "audit_entries"("createdAt");

-- CreateIndex
CREATE INDEX "hazard_reports_reviewState_createdAt_idx" ON "hazard_reports"("reviewState", "createdAt");

-- CreateIndex
CREATE INDEX "hazard_reports_category_createdAt_idx" ON "hazard_reports"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hazard_evidence_reportId_key" ON "hazard_evidence"("reportId");

-- CreateIndex
CREATE INDEX "demo_incidents_status_createdAt_idx" ON "demo_incidents"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "incident_report_links_reportId_key" ON "incident_report_links"("reportId");

-- CreateIndex
CREATE INDEX "incident_report_links_incidentId_idx" ON "incident_report_links"("incidentId");

-- AddForeignKey
ALTER TABLE "township_zones" ADD CONSTRAINT "township_zones_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_nodes" ADD CONSTRAINT "graph_nodes_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "township_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_nodes" ADD CONSTRAINT "graph_nodes_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_segments" ADD CONSTRAINT "road_segments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "township_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_segments" ADD CONSTRAINT "road_segments_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "graph_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_segments" ADD CONSTRAINT "road_segments_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "graph_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_segments" ADD CONSTRAINT "road_segments_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_status_events" ADD CONSTRAINT "road_status_events_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "road_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flood_reports" ADD CONSTRAINT "flood_reports_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "road_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_evidence" ADD CONSTRAINT "hazard_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "hazard_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_report_links" ADD CONSTRAINT "incident_report_links_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "demo_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_report_links" ADD CONSTRAINT "incident_report_links_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "hazard_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

