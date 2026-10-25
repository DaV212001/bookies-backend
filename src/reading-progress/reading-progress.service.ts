import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveReadingProgressDto } from './dto/save-reading-progress.dto';

@Injectable()
export class ReadingProgressService {
  private readonly logger = new Logger(ReadingProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveProgress(userId: string, dto: SaveReadingProgressDto) {
    this.logger.log(
      `Saving progress for user ${userId} on book ${dto.bookId} at ${(dto.progression * 100).toFixed(1)}%`,
    );

    return this.prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId,
        },
      },
      update: {
        cfi: dto.cfi,
        progression: dto.progression,
        updatedAt: new Date(),
      },
      create: {
        userId,
        bookId: dto.bookId,
        cfi: dto.cfi,
        progression: dto.progression,
      },
    });
  }

  async getProgress(userId: string, bookId: string) {
    return this.prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });
  }

  async getAllProgressForUser(userId: string) {
    return this.prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
