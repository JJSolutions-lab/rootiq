import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { ActionType } from '@prisma/client';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { PrismaService } from './prisma.service';

class CreateActionDto {
  @IsString() @MinLength(3) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(ActionType) type!: ActionType;
  @IsOptional() @IsString() defectId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

@Controller('capa') @UseGuards(JwtAuthGuard)
export class CapaController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@Req() req: Request & { user: SessionUser }) {
    return this.prisma.capaAction.findMany({ where: { tenantId: req.user.tenantId }, include: { defect: { select: { reference: true, title: true } }, owner: { select: { id: true, name: true } } }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] });
  }
  @Post() create(@Req() req: Request & { user: SessionUser }, @Body() dto: CreateActionDto) {
    return this.prisma.capaAction.create({ data: { ...dto, tenantId: req.user.tenantId, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined } });
  }
}
