import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommunitiesModule } from './communities/communities.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { LiveSessionsModule } from './live-sessions/live-sessions.module';
import { CatalogModule } from './catalog/catalog.module';
import { ReadingProgressModule } from './reading-progress/reading-progress.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommunitiesModule,
    DiscussionsModule,
    LiveSessionsModule,
    CatalogModule,
    ReadingProgressModule,
  ],
})
export class AppModule {}
