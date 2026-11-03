import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { PrismaService } from './prisma.service';

@Controller('reference') @UseGuards(JwtAuthGuard)
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async all(@Req() req: Request & { user: SessionUser }) {
    const tenantId = req.user.tenantId;
    const [lines, products, users] = await Promise.all([
      this.prisma.productionLine.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.product.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
    ]);
    return { lines, products, users };
  }
}
