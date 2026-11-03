import 'reflect-metadata';
import './env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT || 4000));
  console.log(`RootIQ API running at http://localhost:${process.env.PORT || 4000}/api`);
}
bootstrap();
