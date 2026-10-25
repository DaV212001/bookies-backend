import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('communities/:communityId/live-session')
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Get()
  async getActiveSession(@Param('communityId') communityId: string) {
    return this.liveSessionsService.getActiveSession(communityId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('start')
  async startSession(
    @Param('communityId') communityId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.liveSessionsService.startSession(req.user.id, {
      ...body,
      communityId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('end')
  async endSession(@Param('communityId') communityId: string) {
    return this.liveSessionsService.endSession(communityId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinSession(
    @Param('communityId') communityId: string,
    @Req() req: any,
  ) {
    return this.liveSessionsService.joinSession(communityId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('leave')
  async leaveSession(
    @Param('communityId') communityId: string,
    @Req() req: any,
  ) {
    return this.liveSessionsService.leaveSession(communityId, req.user.id);
  }
}
