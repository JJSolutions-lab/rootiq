import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { DefectStatus, Severity } from '@prisma/client';

class CreateDefectDto {
  @IsString() @MinLength(3) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(Severity) severity!: Severity;
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsInt() @Min(0) quantityChecked!: number;
  @IsInt() @Min(0) quantityDefective!: number;
  @IsOptional() @IsDateString() dueAt?: string;
}

class UpdateDefectDto {
  @IsOptional() @IsEnum(DefectStatus) status?: DefectStatus;
  @IsOptional() @IsEnum(Severity) severity?: Severity;
  @IsOptional() @IsString() ownerId?: string;
}

@Controller('defects') @UseGuards(JwtAuthGuard)
export class DefectsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list(@Req() req: Request & { user: SessionUser }, @Query('search') search?: string) {
    return this.prisma.defect.findMany({
      where: { tenantId: req.user.tenantId, ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }, { batchNumber: { contains: search, mode: 'insensitive' } }] } : {}) },
      include: { line: true, product: true, owner: { select: { id: true, name: true } }, rootCause: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Get(':id')
  get(@Req() req: Request & { user: SessionUser }, @Param('id') id: string) {
    return this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId }, include: { line: true, product: true, owner: { select: { id: true, name: true } }, rootCause: true, actions: { include: { owner: { select: { name: true } } } } } });
  }
  @Post()
  async create(@Req() req: Request & { user: SessionUser }, @Body() dto: CreateDefectDto) {
    const count = await this.prisma.defect.count({ where: { tenantId: req.user.tenantId } });
    return this.prisma.defect.create({ data: { ...dto, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, tenantId: req.user.tenantId, reference: `QI-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}` }, include: { line: true, product: true, owner: { select: { id: true, name: true } } } });
  }
  @Patch(':id')
  async update(@Req() req: Request & { user: SessionUser }, @Param('id') id: string, @Body() dto: UpdateDefectDto) {
    await this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId } });
    return this.prisma.defect.update({ where: { id }, data: dto });
  }
}
