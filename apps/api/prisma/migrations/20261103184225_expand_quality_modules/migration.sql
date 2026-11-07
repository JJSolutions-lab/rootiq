-- AlterTable
ALTER TABLE "RootCause" ADD COLUMN     "eightD" JSONB,
ADD COLUMN     "fishbone" JSONB,
ADD COLUMN     "fmea" JSONB,
ADD COLUMN     "pareto" JSONB;

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "productId" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "producedQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "auditDate" TIMESTAMP(3) NOT NULL,
    "ownerName" TEXT,
    "score" INTEGER,
    "findings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRecord_tenantId_recordDate_idx" ON "ProductionRecord"("tenantId", "recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRecord_tenantId_lineId_recordDate_shift_key" ON "ProductionRecord"("tenantId", "lineId", "recordDate", "shift");

-- CreateIndex
CREATE INDEX "Equipment_tenantId_status_idx" ON "Equipment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_tenantId_code_key" ON "Equipment"("tenantId", "code");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_tenantId_startedAt_idx" ON "MaintenanceEvent"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "QualityAudit_tenantId_auditDate_idx" ON "QualityAudit"("tenantId", "auditDate");

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
