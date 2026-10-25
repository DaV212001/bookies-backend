import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
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
    let email = dto.email;
    let displayName = dto.displayName;
    let avatarUrl = dto.avatarUrl;
    let googleId = dto.googleId;

    if (dto.idToken) {
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: dto.idToken,
          audience: process.env.GOOGLE_CLIENT_ID || undefined,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email || email;
          displayName = payload.name || displayName;
          avatarUrl = payload.picture || avatarUrl;
          googleId = payload.sub || googleId;
        }
      } catch (err) {
        // If Google token verification fails and we don't have direct claims, reject
        if (!email) {
          throw new UnauthorizedException('Invalid Google ID token: ' + err.message);
        }
      }
    }

    if (!email) {
      throw new UnauthorizedException('Google authentication failed: Email is required');
    }

    email = email.toLowerCase();

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
          displayName: user.displayName || displayName || 'Reader',
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
          displayName: displayName || baseUsername,
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

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: process.env.JWT_SECRET || 'super-secret-bookies-jwt-key-2026-change-in-prod',
        expiresIn: '30d',
      },
    );
  }
}
