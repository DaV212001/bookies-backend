import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

// Initialize Sentry for backend exception & performance tracking
Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://39db1e6fdf0b5879e1038fbd16953344@o4512373381398608.ingest.de.sentry.io/4512373381398608',
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 1.0,
});

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
  // Exclude root, home, privacy, terms, and health for direct browser access, Google OAuth branding & UptimeRobot
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'home', 'privacy', 'terms', 'health', 'reader-preview.png'],
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
