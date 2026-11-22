-- CreateTable
CREATE TABLE "road_lines" (
    "areaId" TEXT NOT NULL,
    "wayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "highway" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,
    "properties" JSONB NOT NULL,
    "west" DOUBLE PRECISION NOT NULL,
    "south" DOUBLE PRECISION NOT NULL,
    "east" DOUBLE PRECISION NOT NULL,
    "north" DOUBLE PRECISION NOT NULL,
    "importId" TEXT NOT NULL,

    CONSTRAINT "road_lines_pkey" PRIMARY KEY ("areaId","wayId")
);

-- CreateTable
CREATE TABLE "road_imports" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "road_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "road_lines_areaId_position_idx" ON "road_lines"("areaId", "position");

-- CreateIndex
CREATE INDEX "road_lines_importId_idx" ON "road_lines"("importId");

-- CreateIndex
CREATE INDEX "road_imports_areaId_importedAt_idx" ON "road_imports"("areaId", "importedAt");

-- AddForeignKey
ALTER TABLE "road_lines" ADD CONSTRAINT "road_lines_importId_fkey" FOREIGN KEY ("importId") REFERENCES "road_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

