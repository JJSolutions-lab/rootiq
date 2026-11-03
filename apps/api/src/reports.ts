import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { PrismaService } from './prisma.service';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

@Controller('reports') @UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('defects/:id.pdf')
  async defectPdf(@Req() req: Request & { user: SessionUser }, @Res() res: Response, @Param('id') id: string) {
    const item = await this.prisma.defect.findFirstOrThrow({ where: { id, tenantId: req.user.tenantId }, include: { tenant: true, line: true, product: true, owner: true, rootCause: true, actions: true } });
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html><head><style>body{font:14px Arial;color:#17212b;padding:38px}header{border-bottom:3px solid #0a806c;padding-bottom:18px;margin-bottom:24px}h1{margin:4px 0}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{background:#f4f7f7;padding:12px;border-radius:8px}.label{font-size:10px;color:#697783;text-transform:uppercase}h2{margin-top:28px;color:#0a806c}li{margin:8px 0}</style></head><body><header><strong>RootIQ AI · ${esc(item.tenant.name)}</strong><h1>${esc(item.reference)} — ${esc(item.title)}</h1><small>Generated ${new Date().toLocaleString()}</small></header><div class="meta"><div class="box"><div class="label">Severity</div><b>${esc(item.severity)}</b></div><div class="box"><div class="label">Status</div><b>${esc(item.status)}</b></div><div class="box"><div class="label">Production line</div><b>${esc(item.line?.name)}</b></div><div class="box"><div class="label">Product</div><b>${esc(item.product?.name)}</b></div><div class="box"><div class="label">Batch</div><b>${esc(item.batchNumber)}</b></div><div class="box"><div class="label">Defective quantity</div><b>${item.quantityDefective}</b></div></div><h2>Problem statement</h2><p>${esc(item.description || 'No description recorded.')}</p><h2>Verified root cause</h2><p>${esc(item.rootCause?.verifiedCause || 'Investigation is not yet verified.')}</p><h2>Corrective and preventive actions</h2><ul>${item.actions.map(a => `<li><b>${esc(a.title)}</b> — ${esc(a.status)}</li>`).join('') || '<li>No actions recorded.</li>'}</ul></body></html>`, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' } });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${item.reference}.pdf"`);
      res.send(Buffer.from(pdf));
    } finally { await browser.close(); }
  }
}
