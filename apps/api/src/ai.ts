import { Body, Controller, Injectable, Param, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { PrismaService } from './prisma.service';

const analysisSchema = z.object({
  summary: z.string(),
  hypotheses: z.array(z.object({ cause: z.string(), confidence: z.number().min(0).max(1), evidenceToCheck: z.array(z.string()) })).min(1).max(6),
  recommendedNextSteps: z.array(z.string()).min(1).max(8),
  disclaimer: z.string(),
});
class AnalyzeDto { @IsString() @MinLength(10) observation!: string; }

@Injectable()
export class AiService {
  async analyze(input: { title: string; description?: string | null; observation: string; line?: string; product?: string }) {
    const url = process.env.LLM_API_URL;
    const key = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    if (!url || !key || !model) throw new ServiceUnavailableException('Configure LLM_API_URL, LLM_API_KEY and LLM_MODEL to enable AI analysis');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a manufacturing quality investigation assistant. Suggest hypotheses only; never claim an unverified root cause. Return valid JSON matching the requested schema.' },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'root_cause_analysis', strict: true, schema: { type: 'object', additionalProperties: false, required: ['summary','hypotheses','recommendedNextSteps','disclaimer'], properties: { summary: { type: 'string' }, hypotheses: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['cause','confidence','evidenceToCheck'], properties: { cause: { type: 'string' }, confidence: { type: 'number' }, evidenceToCheck: { type: 'array', items: { type: 'string' } } } } }, recommendedNextSteps: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' } } } } },
      }),
    });
    if (!response.ok) throw new ServiceUnavailableException(`LLM provider returned ${response.status}`);
    const payload = await response.json() as any;
    const raw = payload.choices?.[0]?.message?.content ?? payload.output_text ?? payload;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return analysisSchema.parse(parsed);
  }
}

@Controller('ai') @UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly prisma: PrismaService, private readonly ai: AiService) {}
  @Post('defects/:id/analyze')
  async analyze(@Req() req: Request & { user: SessionUser }, @Param('id') id: string, @Body() dto: AnalyzeDto) {
    const defect = await this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId }, include: { line: true, product: true } });
    const analysis = await this.ai.analyze({ title: defect.title, description: defect.description, observation: dto.observation, line: defect.line?.name, product: defect.product?.name });
    await this.prisma.rootCause.upsert({ where: { defectId: id }, create: { defectId: id, aiSuggestions: analysis }, update: { aiSuggestions: analysis } });
    return analysis;
  }
}
