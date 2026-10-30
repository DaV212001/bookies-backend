import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsGateway } from './live-sessions.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService, LiveSessionsGateway],
  exports: [LiveSessionsService, LiveSessionsGateway],
})
export class LiveSessionsModule {}
