import { BadRequestException } from '@nestjs/common';

export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const gte = from ? new Date(from) : undefined;
  const lte = to ? new Date(to) : undefined;
  if ((gte && Number.isNaN(gte.getTime())) || (lte && Number.isNaN(lte.getTime()))) throw new BadRequestException('Invalid date range');
  if (gte && lte && gte > lte) throw new BadRequestException('From date must be before To date');
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}
