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
import { InspectionsController, OperationsController, RcaController, VirtualMachineService } from './operations';

@Module({
  controllers: [AuthController, DashboardController, DefectsController, CapaController, AiController, ReportsController, ReferenceController, RcaController, InspectionsController, OperationsController],
  providers: [PrismaService, TokenService, AuthService, AiService, JwtAuthGuard, VirtualMachineService],
})
export class AppModule {}
