import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env') });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const passwordHash = await hash('RootIQ@2026', 12);
  const tenant = await prisma.tenant.upsert({ where: { slug: 'aditya-solar' }, update: {}, create: { name: 'Aditya Solar Manufacturing', slug: 'aditya-solar' } });
  const admin = await prisma.user.upsert({ where: { email: 'admin@rootiq.local' }, update: { passwordHash }, create: { tenantId: tenant.id, name: 'Jeevan Kumar', email: 'admin@rootiq.local', passwordHash, role: 'ADMIN' } });
  const engineer = await prisma.user.upsert({ where: { email: 'arun@rootiq.local' }, update: {}, create: { tenantId: tenant.id, name: 'Arun Prakash', email: 'arun@rootiq.local', passwordHash, role: 'QUALITY_ENGINEER' } });
  const lines = await Promise.all(['01','02','03','04'].map(code => prisma.productionLine.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: `LINE-${code}` } }, update: {}, create: { tenantId: tenant.id, code: `LINE-${code}`, name: `Production Line ${code}` } })));
  const products = await Promise.all([
    ['550W Mono PERC Panel','SP-550-MP'],['450W Bifacial Panel','SP-450-BF'],['600W TOPCon Panel','SP-600-TC']
  ].map(([name,sku]) => prisma.product.upsert({ where: { tenantId_sku: { tenantId: tenant.id, sku } }, update: {}, create: { tenantId: tenant.id, name, sku } })));
  const existing = await prisma.defect.count({ where: { tenantId: tenant.id } });
  if (!existing) {
    const defect = await prisma.defect.create({ data: { tenantId: tenant.id, reference: 'QI-2026-0184', title: 'Microcracks detected after lamination', description: 'EL inspection detected recurring microcracks around cell rows 4–6 after the lamination cycle.', severity: 'HIGH', status: 'INVESTIGATING', lineId: lines[2].id, productId: products[0].id, ownerId: engineer.id, batchNumber: 'BT-031126-C', quantityChecked: 5000, quantityDefective: 250, productionLoss: 184000, dueAt: new Date(Date.now()+2*86400000), rootCause: { create: { why1: 'Panels failed EL inspection due to cell microcracks.', why2: 'Localized pressure increased during lamination.', why3: 'The membrane thickness was inconsistent near zone C.', why4: 'Wear was not detected during preventive inspection.', why5: 'The checklist did not require thickness measurement.', verifiedCause: 'Membrane thickness degradation was not controlled by the maintenance standard.', verifiedAt: new Date() } } } });
    await prisma.capaAction.createMany({ data: [
      { tenantId: tenant.id, defectId: defect.id, ownerId: engineer.id, title: 'Replace laminator membrane', type: 'CORRECTIVE', status: 'IN_PROGRESS', dueAt: new Date(Date.now()+86400000) },
      { tenantId: tenant.id, defectId: defect.id, ownerId: admin.id, title: 'Update membrane inspection SOP', type: 'PREVENTIVE', status: 'OPEN', dueAt: new Date(Date.now()+3*86400000) },
    ] });
    for (let i=0;i<14;i++) await prisma.inspection.create({ data: { tenantId: tenant.id, lineId: lines[i%4].id, productId: products[i%3].id, title: 'Daily EL inspection', stage: 'Post-lamination', batchNumber: `BT-${String(i+1).padStart(3,'0')}`, result: i%5===0?'FAILED':'PASSED', checked: 500, failed: i%5===0?18:5, inspectorName: i%2?'Priya S.':'Arun P.', performedAt: new Date(Date.now()-(13-i)*86400000) } });
  }
  console.log('Seed complete. Login: admin@rootiq.local / RootIQ@2026');
}
main().finally(() => prisma.$disconnect());
