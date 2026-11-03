-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'QUALITY_MANAGER', 'QUALITY_ENGINEER', 'PRODUCTION', 'MAINTENANCE', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CONTAINED', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CORRECTIVE', 'PREVENTIVE', 'CONTAINMENT');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'CONDITIONAL');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'QUALITY_ENGINEER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL,
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "lineId" TEXT,
    "productId" TEXT,
    "ownerId" TEXT,
    "batchNumber" TEXT,
    "quantityChecked" INTEGER NOT NULL DEFAULT 0,
    "quantityDefective" INTEGER NOT NULL DEFAULT 0,
    "productionLoss" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RootCause" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT '5_WHYS',
    "why1" TEXT,
    "why2" TEXT,
    "why3" TEXT,
    "why4" TEXT,
    "why5" TEXT,
    "verifiedCause" TEXT,
    "evidence" JSONB,
    "aiSuggestions" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RootCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapaAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defectId" TEXT,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActionType" NOT NULL DEFAULT 'CORRECTIVE',
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "effectivenessNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapaAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defectId" TEXT,
    "lineId" TEXT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "batchNumber" TEXT,
    "result" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "checked" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "inspectorName" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_tenantId_code_key" ON "ProductionLine"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "Defect_tenantId_status_idx" ON "Defect"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Defect_tenantId_detectedAt_idx" ON "Defect"("tenantId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Defect_tenantId_reference_key" ON "Defect"("tenantId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "RootCause_defectId_key" ON "RootCause"("defectId");

-- CreateIndex
CREATE INDEX "CapaAction_tenantId_status_idx" ON "CapaAction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Inspection_tenantId_performedAt_idx" ON "Inspection"("tenantId", "performedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCause" ADD CONSTRAINT "RootCause_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaAction" ADD CONSTRAINT "CapaAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaAction" ADD CONSTRAINT "CapaAction_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaAction" ADD CONSTRAINT "CapaAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
