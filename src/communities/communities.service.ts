import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.community.findMany({
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { members: true, discussions: true } },
      },
    });

    if (!community) {
      throw new NotFoundException(`Community ${id} not found`);
    }

    return community;
  }

  async create(userId: string, dto: {
    name: string;
    description: string;
    bookId: string;
    canonicalFingerprint?: string;
    editionTitle?: string;
    downloadUrl?: string;
    importMembersFromCommunityId?: string;
  }) {
    const community = await this.prisma.community.create({
      data: {
        name: dto.name,
        description: dto.description,
        bookId: dto.bookId,
        creatorId: userId,
        canonicalFingerprint: dto.canonicalFingerprint,
        editionTitle: dto.editionTitle,
        downloadUrl: dto.downloadUrl,
        members: {
          create: {
            userId: userId,
            role: 'creator',
            status: 'active',
          },
        },
      },
    });

    // Handle roster cloning if requested
    if (dto.importMembersFromCommunityId) {
      const sourceMembership = await this.prisma.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId: dto.importMembersFromCommunityId,
            userId,
          },
        },
      });

      if (
        !sourceMembership ||
        (sourceMembership.role !== 'creator' && sourceMembership.role !== 'admin')
      ) {
        throw new ForbiddenException(
          'You can only import member rosters from communities where you are an admin or creator',
        );
      }

      const sourceMembers = await this.prisma.communityMember.findMany({
        where: {
          communityId: dto.importMembersFromCommunityId,
          status: 'active',
          userId: { not: userId },
        },
      });

      for (const m of sourceMembers) {
        await this.prisma.communityMember.create({
          data: {
            communityId: community.id,
            userId: m.userId,
            role: m.role === 'admin' ? 'admin' : 'member',
            status: 'active',
          },
        });
      }
    }

    return this.findOne(community.id);
  }

  async calibrateFingerprint(
    communityId: string,
    userId: string,
    dto: { canonicalFingerprint: string; editionTitle?: string; downloadUrl?: string },
  ) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');
    if (community.creatorId !== userId) {
      throw new ForbiddenException('Only community creator can calibrate edition fingerprint');
    }
    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        canonicalFingerprint: dto.canonicalFingerprint,
        editionTitle: dto.editionTitle ?? community.editionTitle,
        downloadUrl: dto.downloadUrl ?? community.downloadUrl,
      },
    });
    return this.findOne(communityId);
  }

  async join(communityId: string, userId: string) {
    const existing = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    });

    if (existing) {
      if (existing.status === 'banned') {
        throw new ForbiddenException('You have been banned from this community');
      }
      return existing;
    }

    return this.prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: 'member',
        status: 'active',
      },
    });
  }

  async leave(communityId: string, userId: string) {
    return this.prisma.communityMember.deleteMany({
      where: { communityId, userId, role: { not: 'creator' } },
    });
  }

  async getMembers(communityId: string) {
    return this.prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  private async assertCanModerate(communityId: string, callerUserId: string, targetUserId: string) {
    if (callerUserId === targetUserId) {
      throw new ForbiddenException('You cannot moderate yourself');
    }

    const caller = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId: callerUserId },
      },
    });

    if (!caller || (caller.role !== 'creator' && caller.role !== 'admin')) {
      throw new ForbiddenException('Only community creators and admins can perform moderation actions');
    }

    if (caller.status !== 'active') {
      throw new ForbiddenException('Your membership is restricted or banned');
    }

    const target = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
    });

    if (!target) {
      throw new NotFoundException('Target user is not a member of this community');
    }

    // Nobody can moderate the creator
    if (target.role === 'creator') {
      throw new ForbiddenException('Cannot modify the community creator');
    }

    // Admins cannot moderate other admins; only creator can
    if (caller.role === 'admin' && target.role === 'admin') {
      throw new ForbiddenException('Admins cannot moderate other admins; only the creator can');
    }
  }

  async updateRole(communityId: string, callerUserId: string, targetUserId: string, role: 'admin' | 'member') {
    await this.assertCanModerate(communityId, callerUserId, targetUserId);

    // Only the creator can promote someone to admin or demote an existing admin
    const caller = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: callerUserId } },
    });
    if (caller?.role !== 'creator') {
      throw new ForbiddenException('Only the community creator can assign or revoke admin roles');
    }

    return this.prisma.communityMember.update({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
      data: { role },
    });
  }

  async restrict(communityId: string, callerUserId: string, targetUserId: string, reason: string, durationMinutes?: number) {
    await this.assertCanModerate(communityId, callerUserId, targetUserId);
    const restrictedUntil = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : null;
    return this.prisma.communityMember.update({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
      data: {
        status: 'restricted',
        restrictionReason: reason,
        restrictedAt: restrictedUntil,
      },
    });
  }

  async unrestrict(communityId: string, callerUserId: string, targetUserId: string) {
    await this.assertCanModerate(communityId, callerUserId, targetUserId);
    return this.prisma.communityMember.update({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
      data: {
        status: 'active',
        restrictionReason: null,
        restrictedAt: null,
      },
    });
  }

  async ban(communityId: string, callerUserId: string, targetUserId: string, reason: string) {
    await this.assertCanModerate(communityId, callerUserId, targetUserId);
    return this.prisma.communityMember.update({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
      data: {
        status: 'banned',
        restrictionReason: reason,
      },
    });
  }
}
