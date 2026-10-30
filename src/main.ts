import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Flutter mobile/web
  app.enableCors({
    origin: (origin, callback) => {
      // Allow mobile apps, native clients, and web requests with credentials
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global API routing prefix: /api/v1
  // Exclude root, home, privacy, and health for direct browser access, Google OAuth branding & UptimeRobot
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'home', 'privacy', 'health'],
  });

  // Input validation: whitelist properties and transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Bookies NestJS backend running at http://localhost:${port}`);
  logger.log(`📄 Landing page: http://localhost:${port}/home`);
  logger.log(`🔒 Privacy policy: http://localhost:${port}/privacy`);
  logger.log(`💓 Health check: http://localhost:${port}/health`);
}
bootstrap();
