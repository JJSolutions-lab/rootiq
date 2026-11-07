import 'reflect-metadata';
import './env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Passenger may remove the mounted `/api` base URI before forwarding the
  // request, while local development sends it unchanged. Normalize both forms.
  app.use((req: { url: string }, _res: unknown, next: () => void) => {
    const basePath = `/${(process.env.APP_BASE_PATH || 'api').replace(/^\/+|\/+$/g, '')}`;
    if (req.url === basePath || req.url.startsWith(`${basePath}/`)) {
      req.url = req.url.slice(basePath.length) || '/';
    }
    next();
  });
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const rawPort = process.env.PORT;
  const listenTarget = rawPort
    ? (/^\d+$/.test(rawPort) ? Number(rawPort) : rawPort)
    : 4000;
  await app.listen(listenTarget as number);
  console.log(`RootIQ API running at http://localhost:${process.env.PORT || 4000}/api`);
}
bootstrap();
