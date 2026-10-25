import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LiveSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSession(communityId: string) {
    return this.prisma.liveReadingSession.findFirst({
      where: { communityId, isActive: true },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async startSession(userId: string, dto: any) {
    // End any existing active session for this community
    await this.prisma.liveReadingSession.updateMany({
      where: { communityId: dto.communityId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    return this.prisma.liveReadingSession.create({
      data: {
        communityId: dto.communityId,
        bookId: dto.bookId,
        title: dto.title,
        hostId: userId,
        currentCfi: dto.currentCfi,
        chapterTitle: dto.chapterTitle,
        chapterIndex: dto.chapterIndex,
        accessMode: dto.accessMode || 'allMembers',
        allowedUserIds: dto.allowedUserIds || [],
        participantUserIds: [userId],
      },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async endSession(communityId: string) {
    return this.prisma.liveReadingSession.updateMany({
      where: { communityId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
  }

  async joinSession(communityId: string, userId: string) {
    const session = await this.getActiveSession(communityId);
    if (!session) throw new NotFoundException('No active live session found');

    const participants = Array.from(new Set([...session.participantUserIds, userId]));
    return this.prisma.liveReadingSession.update({
      where: { id: session.id },
      data: { participantUserIds: participants },
    });
  }

  async leaveSession(communityId: string, userId: string) {
    const session = await this.getActiveSession(communityId);
    if (!session) return null;

    const participants = session.participantUserIds.filter((id) => id !== userId);
    return this.prisma.liveReadingSession.update({
      where: { id: session.id },
      data: { participantUserIds: participants },
    });
  }
}
