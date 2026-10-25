import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('discussions')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get()
  async findAll(
    @Query('bookId') bookId: string,
    @Query('communityId') communityId?: string,
    @Query('scope') scope?: any,
  ) {
    return this.discussionsService.findByBookOrCommunity(bookId, communityId, scope);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.discussionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.discussionsService.create(req.user.id, body);
  }

  @Post(':id/upvote')
  async upvote(@Param('id') id: string) {
    return this.discussionsService.upvote(id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') beforeId?: string,
  ) {
    return this.discussionsService.getMessages(id, limit ? parseInt(limit, 10) : 50, beforeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  async addMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.discussionsService.addMessage(req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:messageId/reactions')
  async toggleReaction(
    @Param('messageId') messageId: string,
    @Req() req: any,
    @Body('emoji') emoji: string,
  ) {
    return this.discussionsService.toggleReaction(req.user.id, messageId, emoji);
  }
}
