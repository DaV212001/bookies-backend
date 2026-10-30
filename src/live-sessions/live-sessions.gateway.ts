import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LiveSessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveSessionsGateway.name);

  // In-memory registry of active participants per reading session:
  // sessionId -> (userId -> ParticipantProgress)
  private readonly activeSessionParticipants = new Map<string, Map<string, any>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      let token = rawToken;
      if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      if (!token || typeof token !== 'string') {
        this.logger.warn(`Rejecting unauthenticated socket connection: ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const secret =
        process.env.JWT_SECRET || 'super-secret-bookies-jwt-key-2026-change-in-prod';
      const payload = this.jwtService.verify(token, { secret });

      if (!payload || !payload.sub) {
        this.logger.warn(`Invalid JWT token payload for socket: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        this.logger.warn(`User ${payload.sub} not found for socket: ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Attach trusted user identity to socket
      client.data.user = user;
      this.logger.log(
        `Authenticated socket connection: ${client.id} (user: ${user.username} [${user.id}])`,
      );
    } catch (err: any) {
      this.logger.warn(`Socket authentication error for ${client.id}: ${err?.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.removeSocketFromSessions(client.id);
  }

  private removeSocketFromSessions(socketId: string) {
    for (const [sessionId, participants] of this.activeSessionParticipants.entries()) {
      for (const [userId, participant] of participants.entries()) {
        if (participant.socketId === socketId) {
          participants.delete(userId);
          this.server.to(`session:${sessionId}`).emit('live_reading:user_left', {
            sessionId,
            userId,
          });
          this.logger.debug(
            `Removed participant ${userId} from session ${sessionId} on disconnect`,
          );
        }
      }
    }
  }

  @SubscribeMessage('live_reading:join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      progression?: number;
      cfi?: string;
    },
  ) {
    const user = client.data?.user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    const { sessionId, progression, cfi } = data;
    if (!sessionId) return;

    // Verify session exists and is active
    const session = await this.prisma.liveReadingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.isActive) {
      client.emit('error', { message: 'Session is inactive or does not exist' });
      return;
    }

    // Verify user is not banned from the community
    const membership = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: session.communityId,
          userId: user.id,
        },
      },
    });

    if (membership && membership.status === 'banned') {
      client.emit('error', { message: 'You are banned from this community' });
      return;
    }

    client.join(`session:${sessionId}`);

    if (!this.activeSessionParticipants.has(sessionId)) {
      this.activeSessionParticipants.set(sessionId, new Map());
    }

    // Always use verified server-side identity
    const participantData = {
      userId: user.id,
      displayName: user.displayName || user.username || 'Reader',
      username: user.username,
      avatarUrl: user.avatarUrl,
      progression: progression ?? 0.0,
      cfi: cfi ?? '',
      socketId: client.id,
      lastUpdated: new Date().toISOString(),
    };

    const sessionMap = this.activeSessionParticipants.get(sessionId)!;
    sessionMap.set(user.id, participantData);

    this.logger.log(
      `User ${user.displayName} (${user.id}) joined live reading session ${sessionId}`,
    );

    client
      .to(`session:${sessionId}`)
      .emit('live_reading:user_joined', participantData);

    const currentRoster = Array.from(sessionMap.values()).map(
      ({ socketId, ...rest }) => rest,
    );
    client.emit('live_reading:session_roster', {
      sessionId,
      participants: currentRoster,
    });
  }

  @SubscribeMessage('live_reading:leave_session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = client.data?.user;
    if (!user) return;

    const { sessionId } = data;
    if (!sessionId) return;

    const sessionMap = this.activeSessionParticipants.get(sessionId);
    if (sessionMap) {
      sessionMap.delete(user.id);
      this.server
        .to(`session:${sessionId}`)
        .emit('live_reading:user_left', { sessionId, userId: user.id });
      client.emit('live_reading:user_left', { sessionId, userId: user.id });
    }
    client.leave(`session:${sessionId}`);
  }

  @SubscribeMessage('live_reading:update_progress')
  handleUpdateProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      progression: number;
      cfi: string;
      chapterTitle?: string;
      chapterIndex?: number;
    },
  ) {
    const user = client.data?.user;
    if (!user) return;

    const { sessionId, progression, cfi, chapterTitle, chapterIndex } = data;
    if (!sessionId) return;

    const sessionMap = this.activeSessionParticipants.get(sessionId);
    if (sessionMap && sessionMap.has(user.id)) {
      const p = sessionMap.get(user.id);
      p.progression = progression;
      p.cfi = cfi;
      p.chapterTitle = chapterTitle;
      p.chapterIndex = chapterIndex;
      p.lastUpdated = new Date().toISOString();
    }

    this.server.to(`session:${sessionId}`).emit('live_reading:participant_progress', {
      sessionId,
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      progression,
      cfi,
      chapterTitle,
      chapterIndex,
      lastUpdated: new Date().toISOString(),
    });
  }

  @SubscribeMessage('live_reading:react_passage')
  handlePassageReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      cfi: string;
      emoji: string;
      quoteText?: string;
    },
  ) {
    const user = client.data?.user;
    if (!user) return;

    this.logger.log(
      `Passage reaction in session ${data.sessionId}: ${user.displayName} reacted ${data.emoji}`,
    );

    this.server.to(`session:${data.sessionId}`).emit('live_reading:passage_reaction', {
      sessionId: data.sessionId,
      cfi: data.cfi,
      emoji: data.emoji,
      quoteText: data.quoteText,
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room?: string; roomId?: string },
  ) {
    const user = client.data?.user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const target = data.room || data.roomId;
    if (!target) return;

    // Check permissions if joining a thread
    if (target.startsWith('thread_')) {
      const threadId = target.replace('thread_', '');
      const thread = await this.prisma.discussion.findUnique({
        where: { id: threadId },
        select: { id: true, communityId: true },
      });

      if (!thread) {
        client.emit('error', { message: 'Discussion thread not found' });
        return;
      }

      if (thread.communityId) {
        const member = await this.prisma.communityMember.findUnique({
          where: {
            communityId_userId: {
              communityId: thread.communityId,
              userId: user.id,
            },
          },
        });
        if (member && member.status === 'banned') {
          this.logger.warn(`User ${user.id} denied access to room ${target}`);
          client.emit('error', { message: 'Forbidden' });
          return;
        }
      }
    }

    client.join(target);
    this.logger.debug(
      `Socket ${client.id} (user: ${user.id} [${user.username}]) joined room ${target}`,
    );
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room?: string; roomId?: string },
  ) {
    const target = data.room || data.roomId;
    if (target) {
      client.leave(target);
      this.logger.debug(`Socket ${client.id} left room ${target}`);
    }
  }

  @SubscribeMessage('live_reading:host_cfi_sync')
  async handleCfiSync(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId?: string;
      communityId?: string;
      cfi: string;
      progression?: number;
      chapterTitle?: string;
    },
  ) {
    const user = client.data?.user;
    if (!user) return;

    const targetSession = data.sessionId || data.communityId;
    if (!targetSession) return;

    // Verify caller is actually the host of this session
    const session = await this.prisma.liveReadingSession.findFirst({
      where: data.sessionId
        ? { id: data.sessionId }
        : { communityId: data.communityId, isActive: true },
    });

    if (!session || session.hostId !== user.id) {
      this.logger.warn(`User ${user.id} attempted unauthorized host CFI sync`);
      return;
    }

    // 1. Broadcast immediately to all attendees in this session room
    client.to(`session:${targetSession}`).emit('live_reading:page_changed', data);

    // 2. Persist in background
    try {
      if (data.sessionId) {
        await this.prisma.liveReadingSession.update({
          where: { id: data.sessionId },
          data: { currentCfi: data.cfi, chapterTitle: data.chapterTitle },
        });
      } else if (data.communityId) {
        await this.prisma.liveReadingSession.updateMany({
          where: { communityId: data.communityId, isActive: true },
          data: { currentCfi: data.cfi, chapterTitle: data.chapterTitle },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to update live session cfi in DB: ${e?.message}`);
    }
  }

  @SubscribeMessage('live_reading:send_reaction')
  handleLiveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: string; emoji: string },
  ) {
    const user = client.data?.user;
    if (!user) return;

    this.server.to(`session:${data.sessionId}`).emit('live_reading:reaction_received', {
      sessionId: data.sessionId,
      emoji: data.emoji,
      userId: user.id,
      username: user.username,
    });
  }

  @SubscribeMessage('chat:send_message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; message: any },
  ) {
    const user = client.data?.user;
    if (!user) return;

    // Enforce message sender is the authenticated user
    const sanitizedMessage = {
      ...data.message,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };

    this.server
      .to(`thread:${data.threadId}`)
      .emit('chat:message_received', sanitizedMessage);
  }
}
