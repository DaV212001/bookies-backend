import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  async findAll() {
    return this.communitiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.communitiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.communitiesService.create(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/calibrate-edition')
  async calibrateEdition(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { canonicalFingerprint: string; editionTitle?: string; downloadUrl?: string },
  ) {
    return this.communitiesService.calibrateFingerprint(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @Req() req: any) {
    return this.communitiesService.join(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leave')
  async leave(@Param('id') id: string, @Req() req: any) {
    return this.communitiesService.leave(id, req.user.id);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.communitiesService.getMembers(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/members/:userId/role')
  async updateRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: 'admin' | 'member',
    @Req() req: any,
  ) {
    return this.communitiesService.updateRole(id, req.user.id, targetUserId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/members/:userId/restrict')
  async restrict(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() body: { reason: string; durationMinutes?: number },
    @Req() req: any,
  ) {
    return this.communitiesService.restrict(id, req.user.id, targetUserId, body.reason, body.durationMinutes);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/members/:userId/unrestrict')
  async unrestrict(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ) {
    return this.communitiesService.unrestrict(id, req.user.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/members/:userId/ban')
  async ban(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.communitiesService.ban(id, req.user.id, targetUserId, reason);
  }
}
