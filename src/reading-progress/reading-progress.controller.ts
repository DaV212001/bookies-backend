import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';
import { SaveReadingProgressDto } from './dto/save-reading-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reading-progress')
@UseGuards(JwtAuthGuard)
export class ReadingProgressController {
  constructor(
    private readonly readingProgressService: ReadingProgressService,
  ) {}

  @Post()
  async saveProgress(@Req() req: any, @Body() dto: SaveReadingProgressDto) {
    return this.readingProgressService.saveProgress(req.user.id, dto);
  }

  @Get()
  async getAllProgress(@Req() req: any) {
    return this.readingProgressService.getAllProgressForUser(req.user.id);
  }

  @Get(':bookId')
  async getProgress(@Req() req: any, @Param('bookId') bookId: string) {
    return this.readingProgressService.getProgress(req.user.id, bookId);
  }
}
