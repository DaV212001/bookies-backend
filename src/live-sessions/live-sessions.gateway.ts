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

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up any session participation tied to this socket
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
          this.logger.debug(`Removed participant ${userId} from session ${sessionId} on disconnect`);
        }
      }
    }
  }

  @SubscribeMessage('live_reading:join_session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      userId: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
      progression?: number;
      cfi?: string;
    },
  ) {
    const { sessionId, userId, displayName, username, avatarUrl, progression, cfi } = data;
    if (!sessionId || !userId) return;

    client.join(`session:${sessionId}`);

    if (!this.activeSessionParticipants.has(sessionId)) {
      this.activeSessionParticipants.set(sessionId, new Map());
    }

    const participantData = {
      userId,
      displayName: displayName || username || 'Reader',
      username: username || 'reader',
      avatarUrl,
      progression: progression ?? 0.0,
      cfi: cfi ?? '',
      socketId: client.id,
      lastUpdated: new Date().toISOString(),
    };

    const sessionMap = this.activeSessionParticipants.get(sessionId)!;
    sessionMap.set(userId, participantData);

    this.logger.log(`User ${displayName} (${userId}) joined live reading session ${sessionId}`);

    // 1. Notify all others in the room
    client.to(`session:${sessionId}`).emit('live_reading:user_joined', participantData);

    // 2. Return the full roster of active readers in this room to the joining client
    const currentRoster = Array.from(sessionMap.values()).map(({ socketId, ...rest }) => rest);
    client.emit('live_reading:session_roster', {
      sessionId,
      participants: currentRoster,
    });
  }

  @SubscribeMessage('live_reading:leave_session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    const { sessionId, userId } = data;
    if (!sessionId || !userId) return;

    const sessionMap = this.activeSessionParticipants.get(sessionId);
    if (sessionMap) {
      sessionMap.delete(userId);
      this.server.to(`session:${sessionId}`).emit('live_reading:user_left', { sessionId, userId });
      client.emit('live_reading:user_left', { sessionId, userId });
    }
    client.leave(`session:${sessionId}`);
  }

  @SubscribeMessage('live_reading:update_progress')
  handleUpdateProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      userId: string;
      displayName: string;
      avatarUrl?: string;
      progression: number;
      cfi: string;
      chapterTitle?: string;
      chapterIndex?: number;
    },
  ) {
    const { sessionId, userId, progression, cfi, chapterTitle, chapterIndex } = data;
    if (!sessionId || !userId) return;

    const sessionMap = this.activeSessionParticipants.get(sessionId);
    if (sessionMap && sessionMap.has(userId)) {
      const p = sessionMap.get(userId);
      p.progression = progression;
      p.cfi = cfi;
      p.chapterTitle = chapterTitle;
      p.chapterIndex = chapterIndex;
      p.lastUpdated = new Date().toISOString();
    }

    // Broadcast updated location to everyone in the live reading room
    this.server.to(`session:${sessionId}`).emit('live_reading:participant_progress', {
      sessionId,
      userId,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
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
      userId: string;
      displayName: string;
      avatarUrl?: string;
      cfi: string;
      emoji: string;
      quoteText?: string;
    },
  ) {
    this.logger.log(`Passage reaction in session ${data.sessionId}: ${data.displayName} reacted ${data.emoji}`);
    // Broadcast live passage reaction to everyone in the room
    this.server.to(`session:${data.sessionId}`).emit('live_reading:passage_reaction', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room?: string; roomId?: string }) {
    const target = data.room || data.roomId;
    if (target) {
      client.join(target);
      this.logger.debug(`Socket ${client.id} joined room ${target}`);
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room?: string; roomId?: string }) {
    const target = data.room || data.roomId;
    if (target) {
      client.leave(target);
      this.logger.debug(`Socket ${client.id} left room ${target}`);
    }
  }

  @SubscribeMessage('live_reading:host_cfi_sync')
  async handleCfiSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId?: string; communityId?: string; cfi: string; progression?: number; chapterTitle?: string },
  ) {
    const targetSession = data.sessionId || data.communityId;
    // 1. Broadcast immediately to all attendees in this session room
    if (targetSession) {
      client.to(`session:${targetSession}`).emit('live_reading:page_changed', data);
    }

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
    } catch (e) {
      this.logger.warn(`Failed to update live session cfi in DB: ${e.message}`);
    }
  }

  @SubscribeMessage('live_reading:send_reaction')
  handleLiveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; emoji: string; userId: string; username: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('live_reading:reaction_received', data);
  }

  @SubscribeMessage('chat:send_message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; message: any },
  ) {
    this.server.to(`thread:${data.threadId}`).emit('chat:message_received', data.message);
  }
}
