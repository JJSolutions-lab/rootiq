import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, SessionUser } from './jwt.guard';

@Controller('dashboard') @UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('summary')
  async summary(@Req() req: Request & { user: SessionUser }) {
    const tenantId = req.user.tenantId;
    const [openIssues, criticalIssues, actions, inspections, recentIssues] = await Promise.all([
      this.prisma.defect.count({ where: { tenantId, status: { not: 'CLOSED' } } }),
      this.prisma.defect.count({ where: { tenantId, severity: 'CRITICAL', status: { not: 'CLOSED' } } }),
      this.prisma.capaAction.findMany({ where: { tenantId } }),
      this.prisma.inspection.findMany({ where: { tenantId }, orderBy: { performedAt: 'desc' }, take: 250 }),
      this.prisma.defect.findMany({ where: { tenantId }, include: { line: true, product: true, owner: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 6 }),
    ]);
    const checked = inspections.reduce((n, x) => n + x.checked, 0);
    const failed = inspections.reduce((n, x) => n + x.failed, 0);
    const completed = actions.filter(x => ['COMPLETED', 'VERIFIED'].includes(x.status));
    const onTime = completed.filter(x => !x.dueAt || (x.completedAt && x.completedAt <= x.dueAt));
    const loss = recentIssues.reduce((n, x) => n + Number(x.productionLoss), 0);
    return {
      kpis: {
        firstPassYield: checked ? Number((((checked - failed) / checked) * 100).toFixed(1)) : 100,
        openIssues,
        criticalIssues,
        capaOnTimeRate: completed.length ? Number(((onTime.length / completed.length) * 100).toFixed(1)) : 100,
        costOfPoorQuality: loss,
      },
      recentIssues,
      trend: this.buildTrend(inspections),
    };
  }

  private buildTrend(rows: { performedAt: Date; checked: number; failed: number }[]) {
    const days = new Map<string, { checked: number; failed: number }>();
    for (const row of rows) {
      const day = row.performedAt.toISOString().slice(0, 10);
      const current = days.get(day) || { checked: 0, failed: 0 };
      current.checked += row.checked; current.failed += row.failed; days.set(day, current);
    }
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, x]) => ({
      date, yield: x.checked ? Number((((x.checked - x.failed) / x.checked) * 100).toFixed(1)) : 100,
      defectRate: x.checked ? Number(((x.failed / x.checked) * 100).toFixed(1)) : 0,
    }));
  }
}
