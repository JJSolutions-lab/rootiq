import { Body, Controller, Get, HttpCode, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { compare, hash } from 'bcryptjs';
import type { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, SessionUser } from './jwt.guard';
import { TokenService } from './token.service';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

class RegisterDto extends LoginDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) companyName!: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: TokenService) {}

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new UnauthorizedException('An account already exists for this email');
    const slug = `${dto.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug,
        users: { create: { name: dto.name, email: dto.email.toLowerCase(), passwordHash: await hash(dto.password, 12), role: 'ADMIN' } },
        lines: { create: [{ name: 'Production Line 01', code: 'LINE-01' }] },
      },
      include: { users: true },
    });
    return this.createSession(tenant.users[0], res);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.createSession(user, res);
  }

  async profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  private async createSession(user: { id: string; tenantId: string; name: string; email: string; role: string }, res: Response) {
    const token = this.jwt.sign({ sub: user.id, tenantId: user.tenantId, role: user.role });
    res.cookie('rootiq_session', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return { user: await this.profile(user.id) };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(dto, res);
  }

  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('rootiq_session', { path: '/' });
    return { ok: true };
  }

  @Get('me') @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user: SessionUser }) {
    return this.auth.profile(req.user.userId);
  }
}
