import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController, AuthService } from './auth';
import { JwtAuthGuard } from './jwt.guard';
import { DashboardController } from './dashboard';
import { DefectsController } from './defects';
import { CapaController } from './capa';
import { AiController, AiService } from './ai';
import { ReportsController } from './reports';
import { ReferenceController } from './reference';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController, DashboardController, DefectsController, CapaController, AiController, ReportsController, ReferenceController],
  providers: [PrismaService, TokenService, AuthService, AiService, JwtAuthGuard],
})
export class AppModule {}
