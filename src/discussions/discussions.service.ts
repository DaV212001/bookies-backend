import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBookOrCommunity(bookId: string, communityId?: string, scope?: any) {
    const where: any = { bookId };
    if (communityId) where.communityId = communityId;
    if (scope) where.scope = scope;

    return this.prisma.discussion.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!discussion) throw new NotFoundException('Discussion not found');
    return discussion;
  }

  async create(userId: string, dto: any) {
    return this.prisma.discussion.create({
      data: {
        highlightId: dto.highlightId || 'general',
        bookId: dto.bookId,
        communityId: dto.communityId,
        userId: userId,
        title: dto.title,
        content: dto.content,
        scope: dto.scope || 'passage',
        chapterTitle: dto.chapterTitle,
        chapterIndex: dto.chapterIndex,
        quoteText: dto.quoteText,
        rating: dto.rating,
        parentTopicId: dto.parentTopicId,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async upvote(id: string) {
    return this.prisma.discussion.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
  }

  async getMessages(threadId: string, limit = 50, beforeId?: string) {
    const where: any = { threadId };
    if (beforeId) {
      const cursor = await this.prisma.chatMessage.findUnique({ where: { id: beforeId } });
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt };
      }
    }

    return this.prisma.chatMessage.findMany({
      where,
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMessage(userId: string, threadId: string, dto: any) {
    return this.prisma.chatMessage.create({
      data: {
        threadId,
        userId,
        content: dto.content,
        replyToId: dto.replyToId,
        replyToContent: dto.replyToContent,
        replyToAuthor: dto.replyToAuthor,
        isSpoiler: dto.isSpoiler || false,
        quoteText: dto.quoteText,
        chapterTitle: dto.chapterTitle,
        chapterIndex: dto.chapterIndex,
        cfi: dto.cfi,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');

    const reactions = (msg.reactions as Record<string, string[]>) || {};
    const users = reactions[emoji] || [];

    if (users.includes(userId)) {
      reactions[emoji] = users.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userId];
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions: reactions },
    });
  }
}
