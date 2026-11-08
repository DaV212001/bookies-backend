import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';


class UsernameAvailabilityCache {
  private cache = new Map<string, { available: boolean; timestamp: number }>();
  private readonly maxEntries = 5000;
  private readonly ttlMs = 60 * 1000; // 60 seconds

  get(username: string): boolean | undefined {
    const entry = this.cache.get(username);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(username);
      return undefined;
    }
    return entry.available;
  }

  set(username: string, available: boolean) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(username, { available, timestamp: Date.now() });
  }

  invalidate(username: string) {
    this.cache.delete(username.toLowerCase());
  }
}

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'api', 'bookies',
  'system', 'mod', 'moderator', 'official', 'null', 'undefined', 'anonymous',
  'everyone', 'here', 'channel', 'service', 'guest', 'bot', 'security',
]);

@Injectable()
export class AuthService {
  private readonly availabilityCache = new UsernameAvailabilityCache();
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
      },
    });

    if (existing) {
      throw new ConflictException('Email or username is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
      },
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      accessToken: token,
    };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      accessToken: token,
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    if (!dto.idToken) {
      throw new UnauthorizedException('Google ID token is required');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID || undefined,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      throw new UnauthorizedException('Invalid Google ID token: ' + (err?.message || 'Verification failed'));
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Google authentication failed: Email claim missing from ID token');
    }

    const email = payload.email.toLowerCase();
    const displayName = payload.name || dto.displayName || 'Reader';
    const avatarUrl = payload.picture || dto.avatarUrl;
    const googleId = payload.sub;

    // Check if user already exists by googleId or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(googleId ? [{ googleId }] : []),
          { email },
        ],
      },
    });

    if (user) {
      // Link googleId or update avatar if missing
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: user.avatarUrl || avatarUrl,
          displayName: user.displayName || displayName,
        },
      });
    } else {
      // Generate clean username from email or name
      const baseUsername = (email.split('@')[0] || 'reader').replace(/[^a-zA-Z0-9_]/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${baseUsername}_${uniqueSuffix}`.toLowerCase();

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          displayName,
          avatarUrl,
          googleId,
        },
      });
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      accessToken: token,
    };
  }



  async checkUsernameAvailability(rawUsername: string, currentUserId?: string): Promise<{
    available: boolean;
    username: string;
    reason?: 'INVALID_FORMAT' | 'RESERVED' | 'TAKEN' | 'AVAILABLE' | 'CURRENT_USER';
    message: string;
  }> {
    if (!rawUsername) {
      return {
        available: false,
        username: '',
        reason: 'INVALID_FORMAT',
        message: 'Username cannot be empty',
      };
    }

    const clean = rawUsername.trim().toLowerCase();

    // 1. Regex validation (3-30 characters, alphanumeric & underscore only)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      return {
        available: false,
        username: clean,
        reason: 'INVALID_FORMAT',
        message: 'Must be 3–30 characters, alphanumeric and underscores only',
      };
    }

    // 2. Reserved system keywords (O(1) in-memory check)
    if (RESERVED_USERNAMES.has(clean)) {
      return {
        available: false,
        username: clean,
        reason: 'RESERVED',
        message: `@${clean} is a reserved system handle`,
      };
    }

    // 3. User's own username (if authenticated)
    if (currentUserId) {
      const current = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { username: true },
      });
      if (current && current.username === clean) {
        return {
          available: true,
          username: clean,
          reason: 'CURRENT_USER',
          message: 'Current handle',
        };
      }
    }

    // 4. In-Memory LRU Cache Check (O(1), zero DB overhead)
    const cached = this.availabilityCache.get(clean);
    if (cached !== undefined) {
      return {
        available: cached,
        username: clean,
        reason: cached ? 'AVAILABLE' : 'TAKEN',
        message: cached ? `@${clean} is available` : `@${clean} is already taken`,
      };
    }

    // 5. High-efficiency Index-Only Scan in PostgreSQL (O(log N) B-Tree lookup)
    const existing = await this.prisma.user.findFirst({
      where: { username: clean },
      select: { id: true },
    });

    const isAvailable = !existing;
    this.availabilityCache.set(clean, isAvailable);

    return {
      available: isAvailable,
      username: clean,
      reason: isAvailable ? 'AVAILABLE' : 'TAKEN',
      message: isAvailable ? `@${clean} is available` : `@${clean} is already taken`,
    };
  }

  decodeTokenUserId(token: string): string | undefined {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.sub;
    } catch {
      return undefined;
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate: {
      displayName?: string;
      username?: string;
      avatarUrl?: string | null;
    } = {};

    if (dto.displayName !== undefined && dto.displayName.trim().length > 0) {
      dataToUpdate.displayName = dto.displayName.trim();
    }

    if (dto.username !== undefined && dto.username.trim().length > 0) {
      const cleanUsername = dto.username.trim().toLowerCase();
      if (cleanUsername !== existing.username) {
        const taken = await this.prisma.user.findFirst({
          where: {
            username: cleanUsername,
            id: { not: userId },
          },
        });
        if (taken) {
          throw new ConflictException(`Username @${cleanUsername} is already taken`);
        }
        dataToUpdate.username = cleanUsername;
        this.availabilityCache.invalidate(cleanUsername);
      }
    }

    if (dto.avatarUrl !== undefined) {
      dataToUpdate.avatarUrl = dto.avatarUrl.trim() || null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
    };
  }

  private generateToken(userId: string, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is not defined in production');
    }
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: secret || 'super-secret-bookies-jwt-key-2026-change-in-prod',
        expiresIn: '7d',
      },
    );
  }
}
