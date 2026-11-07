import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')] });
const prisma = new PrismaClient();
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
  await prisma.rootCause.updateMany({ data: {
    fishbone: { Machine: ['Laminator membrane wear','Pressure sensor drift'], Method: ['Inspection interval too long'], Material: ['Cell thickness variation'], Manpower: ['Handling pressure variation'], Measurement: ['No membrane thickness check'], Environment: ['Temperature variation near zone C'] },
    pareto: { categories: [{ name:'Lamination pressure', count:112 },{ name:'Cell handling', count:64 },{ name:'Stringer alignment', count:38 },{ name:'Material variation', count:23 },{ name:'Other', count:13 }] },
    fmea: { rows: [{ mode:'Membrane wear', effect:'Cell microcracks', severity:9, occurrence:6, detection:7, rpn:378 },{ mode:'Pressure recipe drift', effect:'Uneven lamination', severity:8, occurrence:4, detection:5, rpn:160 }] },
    eightD: { d1:'Cross-functional team assigned', d2:'250 panels failed EL inspection after lamination', d3:'Batch quarantined and Line 03 held', d4:'Membrane thickness degradation not controlled', d5:'Replace membrane and revise inspection standard', d6:'Pilot validation scheduled', d7:'Update all laminator PM checklists', d8:'Pending effectiveness verification' }
  } });
  if (!(await prisma.productionRecord.count({ where: { tenantId: tenant.id } }))) {
    for (let day=0; day<14; day++) for (let li=0; li<4; li++) await prisma.productionRecord.create({ data: { tenantId:tenant.id, lineId:lines[li].id, productId:products[li%3].id, recordDate:new Date(new Date().setHours(0,0,0,0)-day*86400000), shift:'A', plannedQty:1250, producedQty:1180+((day*17+li*23)%65), rejectedQty:li===2&&day<3?42:8+((day+li)%11), downtimeMinutes:li===2?24+day:5+((day*li)%14) } });
  }
  const equipmentData = [
    ['LAM-03','Laminator 03','Laminator','ATTENTION',72,lines[2].id],
    ['STR-04','Stringer 04','Stringer','RUNNING',94,lines[3].id],
    ['ELT-02','EL Tester 02','Inspection','RUNNING',97,lines[1].id],
    ['FRM-01','Framing Station 01','Assembly','MAINTENANCE',81,lines[0].id]
  ] as const;
  for (const [code,name,type,status,healthScore,lineId] of equipmentData) await prisma.equipment.upsert({ where:{ tenantId_code:{tenantId:tenant.id,code} }, update:{status,healthScore}, create:{tenantId:tenant.id,code,name,type,status,healthScore,lineId,lastMaintenanceAt:new Date(Date.now()-18*86400000),nextMaintenanceAt:new Date(Date.now()+12*86400000)} });
  const laminator = await prisma.equipment.findFirstOrThrow({ where:{tenantId:tenant.id,code:'LAM-03'} });
  if (!(await prisma.maintenanceEvent.count({where:{tenantId:tenant.id}}))) await prisma.maintenanceEvent.create({data:{tenantId:tenant.id,equipmentId:laminator.id,type:'CORRECTIVE',description:'Inspect and replace worn laminator membrane near zone C',status:'IN_PROGRESS',downtimeMinutes:42}});
  if (!(await prisma.qualityAudit.count({where:{tenantId:tenant.id}}))) await prisma.qualityAudit.createMany({data:[
    {tenantId:tenant.id,title:'Q4 Internal Quality Audit',standard:'ISO 9001:2015',status:'IN_PROGRESS',auditDate:new Date(Date.now()+5*86400000),ownerName:'Priya S.',findings:3},
    {tenantId:tenant.id,title:'Process Control Audit — Lamination',standard:'IEC 61215',status:'COMPLETED',auditDate:new Date(Date.now()-12*86400000),ownerName:'Arun P.',findings:2,score:91},
    {tenantId:tenant.id,title:'Supplier Cell Quality Audit',standard:'Supplier QMS',status:'PLANNED',auditDate:new Date(Date.now()+21*86400000),ownerName:'Jeevan Kumar',findings:0}
  ]});
  console.log('Seed complete. Login: admin@rootiq.local / RootIQ@2026');
}
main().finally(() => prisma.$disconnect());
