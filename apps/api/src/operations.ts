import { Body, Controller, Get, Injectable, OnModuleDestroy, Param, Patch, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { Prisma } from '@prisma/client';
import { dateRange } from './date-range';
import { Observable, Subject, filter, map } from 'rxjs';

class SaveRcaDto {
  @IsOptional() @IsString() why1?: string;
  @IsOptional() @IsString() why2?: string;
  @IsOptional() @IsString() why3?: string;
  @IsOptional() @IsString() why4?: string;
  @IsOptional() @IsString() why5?: string;
  @IsOptional() @IsString() verifiedCause?: string;
  @IsOptional() @IsObject() fishbone?: Record<string, unknown>;
  @IsOptional() @IsObject() pareto?: Record<string, unknown>;
  @IsOptional() @IsObject() fmea?: Record<string, unknown>;
  @IsOptional() @IsObject() eightD?: Record<string, unknown>;
}

class CreateInspectionDto {
  @IsString() @MinLength(3) title!: string;
  @IsString() stage!: string;
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() defectId?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsString() result!: string;
  @IsInt() @Min(0) checked!: number;
  @IsInt() @Min(0) failed!: number;
  @IsOptional() @IsString() inspectorName?: string;
}

class CreateProductionRecordDto {
  @IsString() lineId!: string;
  @IsOptional() @IsString() productId?: string;
  @IsString() recordDate!: string;
  @IsString() shift!: string;
  @IsInt() @Min(0) plannedQty!: number;
  @IsInt() @Min(0) producedQty!: number;
  @IsInt() @Min(0) rejectedQty!: number;
  @IsInt() @Min(0) downtimeMinutes!: number;
}

type MachineState = {
  timer: NodeJS.Timeout;
  cycle: number;
  busy: boolean;
  startedAt: Date;
  lastCycleAt?: Date;
  error?: string;
};

@Injectable()
export class VirtualMachineService implements OnModuleDestroy {
  private readonly machines = new Map<string, MachineState>();
  private readonly liveEvents = new Subject<{ tenantId: string; status: ReturnType<VirtualMachineService['status']> }>();

  constructor(private readonly prisma: PrismaService) {}

  status(tenantId: string) {
    const machine = this.machines.get(tenantId);
    return machine
      ? { running: true, cycle: machine.cycle, startedAt: machine.startedAt, lastCycleAt: machine.lastCycleAt, error: machine.error }
      : { running: false, cycle: 0 };
  }

  events(tenantId: string): Observable<{ data: ReturnType<VirtualMachineService['status']> }> {
    return this.liveEvents.pipe(
      filter((event) => event.tenantId === tenantId),
      map((event) => ({ data: event.status })),
    );
  }

  async start(tenantId: string) {
    if (this.machines.has(tenantId)) return this.status(tenantId);
    const refs = await this.prisma.productionLine.count({ where: { tenantId, active: true } });
    const products = await this.prisma.product.count({ where: { tenantId } });
    if (!refs || !products) throw new Error('Add an active production line and product before starting the virtual machine.');

    const machine: MachineState = {
      cycle: 0,
      busy: false,
      startedAt: new Date(),
      timer: setInterval(() => void this.runCycle(tenantId), 5000),
    };
    this.machines.set(tenantId, machine);
    await this.runCycle(tenantId);
    return this.status(tenantId);
  }

  stop(tenantId: string) {
    const machine = this.machines.get(tenantId);
    if (machine) clearInterval(machine.timer);
    this.machines.delete(tenantId);
    const status = { running: false, cycle: machine?.cycle ?? 0 };
    this.liveEvents.next({ tenantId, status });
    return status;
  }

  onModuleDestroy() {
    for (const machine of this.machines.values()) clearInterval(machine.timer);
    this.machines.clear();
  }

  private async runCycle(tenantId: string) {
    const machine = this.machines.get(tenantId);
    if (!machine || machine.busy) return;
    machine.busy = true;
    try {
      const [lines, products] = await Promise.all([
        this.prisma.productionLine.findMany({ where: { tenantId, active: true }, orderBy: { code: 'asc' } }),
        this.prisma.product.findMany({ where: { tenantId }, orderBy: { sku: 'asc' } }),
      ]);
      if (!lines.length || !products.length) throw new Error('No active production line or product is available.');
      const nextCycle = machine.cycle + 1;
      const line = lines[(nextCycle - 1) % lines.length];
      const product = products[(nextCycle - 1) % products.length];
      const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const produced = random(90, 120);
      const rejected = Math.random() < 0.2 ? random(7, 14) : random(0, 4);
      const downtime = Math.random() < 0.12 ? random(2, 8) : 0;
      const now = new Date();
      const batch = `SIM-${now.toISOString().replace(/\D/g, '').slice(0, 14)}-${nextCycle}`;

      await this.prisma.$transaction(async (tx) => {
        await tx.productionRecord.create({ data: { tenantId, lineId: line.id, productId: product.id, recordDate: now, shift: `SIM-${nextCycle}`, plannedQty: 120, producedQty: produced, rejectedQty: rejected, downtimeMinutes: downtime } });
        await tx.inspection.create({ data: { tenantId, lineId: line.id, productId: product.id, title: 'Virtual EL inspection', stage: 'Post-lamination', batchNumber: batch, result: rejected > 6 ? 'FAILED' : 'PASSED', checked: produced, failed: rejected, inspectorName: 'Virtual Machine' } });
        if (rejected > 6) {
          const count = await tx.defect.count({ where: { tenantId } });
          await tx.defect.create({ data: { tenantId, reference: `QI-${now.getFullYear()}-${String(count + 1).padStart(4, '0')}`, title: 'Virtual EL: excessive cell defects', description: `Virtual machine detected ${rejected} failed panels in batch ${batch}.`, severity: rejected > 10 ? 'CRITICAL' : 'HIGH', lineId: line.id, productId: product.id, batchNumber: batch, quantityChecked: produced, quantityDefective: rejected } });
        }
      });
      machine.cycle = nextCycle;
      machine.lastCycleAt = now;
      machine.error = undefined;
    } catch (error) {
      machine.error = error instanceof Error ? error.message : 'Virtual machine cycle failed';
    } finally {
      machine.busy = false;
      this.liveEvents.next({ tenantId, status: this.status(tenantId) });
    }
  }
}

@Controller('rca') @UseGuards(JwtAuthGuard)
export class RcaController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('defects/:id')
  get(@Req() req: Request & { user: SessionUser }, @Param('id') id: string) {
    return this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId }, include: { line: true, product: true, rootCause: true, actions: { include: { owner: { select: { name: true } } } } } });
  }
  @Patch('defects/:id')
  async save(@Req() req: Request & { user: SessionUser }, @Param('id') id: string, @Body() dto: SaveRcaDto) {
    await this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId } });
    const data = { ...dto, fishbone: dto.fishbone as Prisma.InputJsonValue | undefined, pareto: dto.pareto as Prisma.InputJsonValue | undefined, fmea: dto.fmea as Prisma.InputJsonValue | undefined, eightD: dto.eightD as Prisma.InputJsonValue | undefined };
    return this.prisma.rootCause.upsert({ where: { defectId: id }, create: { defectId: id, ...data }, update: data });
  }
}

@Controller('inspections') @UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@Req() req: Request & { user: SessionUser }, @Query('from') from?: string, @Query('to') to?: string) {
    const range = dateRange(from, to);
    return this.prisma.inspection.findMany({ where: { tenantId: req.user.tenantId, ...(range ? { performedAt: range } : {}) }, include: { line: true, product: true, defect: { select: { reference: true } } }, orderBy: { performedAt: 'desc' }, take: 100 });
  }
  @Post() create(@Req() req: Request & { user: SessionUser }, @Body() dto: CreateInspectionDto) {
    return this.prisma.inspection.create({ data: { ...dto, result: dto.result as any, tenantId: req.user.tenantId } });
  }
}

@Controller('operations') @UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly prisma: PrismaService, private readonly virtualMachine: VirtualMachineService) {}
  @Get('virtual-machine')
  virtualMachineStatus(@Req() req: Request & { user: SessionUser }) {
    return this.virtualMachine.status(req.user.tenantId);
  }
  @Sse('virtual-machine/events')
  virtualMachineEvents(@Req() req: Request & { user: SessionUser }) {
    return this.virtualMachine.events(req.user.tenantId);
  }
  @Post('virtual-machine/start')
  startVirtualMachine(@Req() req: Request & { user: SessionUser }) {
    return this.virtualMachine.start(req.user.tenantId);
  }
  @Post('virtual-machine/stop')
  stopVirtualMachine(@Req() req: Request & { user: SessionUser }) {
    return this.virtualMachine.stop(req.user.tenantId);
  }
  @Get('production')
  async production(@Req() req: Request & { user: SessionUser }, @Query('from') from?: string, @Query('to') to?: string) {
    const range = dateRange(from, to);
    const records = await this.prisma.productionRecord.findMany({ where: { tenantId: req.user.tenantId, ...(range ? { recordDate: range } : {}) }, include: { line: true, product: true }, orderBy: { recordDate: 'desc' }, take: 120 });
    const totals = records.reduce((a, x) => ({ planned: a.planned+x.plannedQty, produced: a.produced+x.producedQty, rejected: a.rejected+x.rejectedQty, downtime: a.downtime+x.downtimeMinutes }), { planned:0, produced:0, rejected:0, downtime:0 });
    const lines = [...new Set(records.map(x => x.lineId))].map(lineId => { const r=records.filter(x=>x.lineId===lineId); const produced=r.reduce((n,x)=>n+x.producedQty,0); const rejected=r.reduce((n,x)=>n+x.rejectedQty,0); return { lineId, name:r[0].line.name, produced, rejected, yield:produced?Number(((produced-rejected)/produced*100).toFixed(1)):100, downtime:r.reduce((n,x)=>n+x.downtimeMinutes,0) }; });
    return { totals, lines, records };
  }
  @Post('production')
  async createProduction(@Req() req: Request & { user: SessionUser }, @Body() dto: CreateProductionRecordDto) {
    await this.prisma.productionLine.findFirstOrThrow({ where: { id: dto.lineId, tenantId: req.user.tenantId } });
    if (dto.productId) await this.prisma.product.findFirstOrThrow({ where: { id: dto.productId, tenantId: req.user.tenantId } });
    return this.prisma.productionRecord.create({
      data: { ...dto, recordDate: new Date(dto.recordDate), tenantId: req.user.tenantId },
      include: { line: true, product: true },
    });
  }
  @Get('equipment') equipment(@Req() req: Request & { user: SessionUser }) {
    return this.prisma.equipment.findMany({ where: { tenantId: req.user.tenantId }, include: { line: true, events: { orderBy: { startedAt: 'desc' }, take: 3 } }, orderBy: { healthScore: 'asc' } });
  }
  @Get('audits') audits(@Req() req: Request & { user: SessionUser }) {
    return this.prisma.qualityAudit.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { auditDate: 'desc' } });
  }
}
