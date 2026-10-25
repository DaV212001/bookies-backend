import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('Bookies Backend - Full End-to-End Flow Tests', () => {
  let app: INestApplication;
  let serverAddress: string;
  let authToken: string;
  let testUserId: string;
  let testCommunityId: string;
  let testDiscussionId: string;
  let socketClient: Socket;

  const timestamp = Date.now();
  const testUser = {
    username: `e2e_reader_${timestamp}`,
    email: `e2e_${timestamp}@bookies.app`,
    displayName: 'E2E Reader',
    password: 'Password123!',
  };

  const memberUser = {
    username: `member_${timestamp}`,
    email: `member_${timestamp}@bookies.app`,
    displayName: 'Member Reader',
    password: 'Password123!',
  };
  let memberToken: string;
  let memberUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false,
        transform: true,
      }),
    );

    // Listen on an ephemeral port for both HTTP and Socket.IO
    await app.listen(0);
    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? address : address.port;
    serverAddress = `http://localhost:${port}`;
  }, 30000);

  afterAll(async () => {
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
    }
    await app.close();
  });

  describe('Flow 1: Authentication & User Profiles', () => {
    it('registers the primary user and returns a signed JWT accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.username).toBe(testUser.username.toLowerCase());

      authToken = res.body.accessToken;
      testUserId = res.body.user.id;
    });

    it('registers a secondary member user for RBAC tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(memberUser)
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      memberToken = res.body.accessToken;
      memberUserId = res.body.user.id;
    });

    it('logs in successfully with registered credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect((r) => expect([200, 201]).toContain(r.status));

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.id).toBe(testUserId);
    });

    it('fetches current user profile with Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(testUserId);
      expect(res.body.email).toBe(testUser.email.toLowerCase());
    });

    it('supports Google authentication / fallback provisioning', async () => {
      const googlePayload = {
        idToken: `mock-google-token-${timestamp}`,
        email: `google_${timestamp}@bookies.app`,
        displayName: 'Google Test Reader',
        avatarUrl: 'https://lh3.googleusercontent.com/test.png',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send(googlePayload)
        .expect((r) => expect([200, 201]).toContain(r.status));

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(googlePayload.email.toLowerCase());
    });
  });

  describe('Flow 2: Discover & Book Catalog', () => {
    let firstCatalogBook: any;

    it('fetches featured discover books with valid download URLs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/catalog/featured')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      firstCatalogBook = res.body[0];
      expect(firstCatalogBook).toHaveProperty('id');
      expect(firstCatalogBook).toHaveProperty('title');
      expect(firstCatalogBook).toHaveProperty('downloadUrl');
      expect(firstCatalogBook.downloadUrl).toContain('/api/v1/catalog/');
    });

    it('searches books in the catalog by keyword from database cache', async () => {
      const queryKeyword = firstCatalogBook?.title?.split(' ')[0] || 'Dune';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/search?q=${encodeURIComponent(queryKeyword)}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns book details with enriched downloadUrl', async () => {
      const bookId = firstCatalogBook.id;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/${bookId}`)
        .expect(200);

      expect(res.body.id).toBe(bookId);
      expect(res.body.downloadUrl).toContain(`/api/v1/catalog/${bookId}/download`);
    });
  });

  describe('Flow 3: Community Lifecycle & Moderation RBAC', () => {
    it('creates a new reading community as owner/admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/communities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Dune Readers Club ${timestamp}`,
          description: 'A deep dive into the Dune chronicles',
          bookId: 'bookies-catalog-dune-1',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(`Dune Readers Club ${timestamp}`);
      testCommunityId = res.body.id;
    });

    it('lists all active communities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communities')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === testCommunityId)).toBe(true);
    });

    it('allows a secondary member to join the community', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/communities/${testCommunityId}/join`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(res.body.role).toBe('member');
    });

    it('retrieves member roster for the community', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/communities/${testCommunityId}/members`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('allows the community owner to promote member to admin', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/communities/${testCommunityId}/members/${memberUserId}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.role).toBe('admin');
    });

    it('allows community admin to restrict a member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/communities/${testCommunityId}/members/${memberUserId}/restrict`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Spoiler violations in public discussion',
          durationMinutes: 60,
        })
        .expect(201);

      expect(res.body.status).toBe('restricted');
      expect(res.body.restrictionReason).toBe('Spoiler violations in public discussion');
    });

    it('allows community admin to unrestrict member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/communities/${testCommunityId}/members/${memberUserId}/unrestrict`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.status).toBe('active');
    });
  });

  describe('Flow 4: Discussions & Community Threading', () => {
    it('creates a discussion thread inside the community', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/discussions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'The Gom Jabbar Scene Breakdown',
          content: 'Let us examine the Litany Against Fear.',
          bookId: 'bookies-catalog-dune-1',
          communityId: testCommunityId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('The Gom Jabbar Scene Breakdown');
      testDiscussionId = res.body.id;
    });

    it('adds a reply message to the discussion thread', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/discussions/${testDiscussionId}/messages`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          content: 'I must not fear. Fear is the mind-killer.',
        })
        .expect(201);

      expect(res.body.content).toBe('I must not fear. Fear is the mind-killer.');
    });

    it('upvotes the discussion thread', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/discussions/${testDiscussionId}/upvote`)
        .expect(201);

      expect(res.body.upvotes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Flow 5: Reading Progress Persistence', () => {
    const bookId = 'bookies-catalog-dune-1';

    it('saves reader CFI and progression percentage', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reading-progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          cfi: 'epubcfi(/6/14[chapter-2]!/4/2/10/1:42)',
          progression: 0.385,
        })
        .expect(201);

      expect(res.body.bookId).toBe(bookId);
      expect(res.body.progression).toBeCloseTo(0.385, 2);
      expect(res.body.cfi).toBe('epubcfi(/6/14[chapter-2]!/4/2/10/1:42)');
    });

    it('retrieves saved reading progress for the authenticated reader', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reading-progress/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.bookId).toBe(bookId);
      expect(res.body.cfi).toBe('epubcfi(/6/14[chapter-2]!/4/2/10/1:42)');
      expect(res.body.progression).toBeCloseTo(0.385, 2);
    });
  });

  describe('Flow 6: Real-time Live Reading Socket.IO Gateway', () => {
    const sessionId = `live-session-${Date.now()}`;

    beforeAll((done) => {
      socketClient = io(serverAddress, {
        transports: ['websocket'],
        reconnection: false,
      });

      socketClient.on('connect', () => {
        done();
      });

      socketClient.on('connect_error', (err) => {
        done(err);
      });
    });

    it('joins live reading session and receives the roster', (done) => {
      socketClient.once('live_reading:session_roster', (data: any) => {
        expect(data.sessionId).toBe(sessionId);
        expect(Array.isArray(data.participants)).toBe(true);
        const me = data.participants.find((p: any) => p.userId === testUserId);
        expect(me).toBeDefined();
        expect(me.displayName).toBe(testUser.displayName);
        done();
      });

      socketClient.emit('live_reading:join_session', {
        sessionId,
        userId: testUserId,
        displayName: testUser.displayName,
        username: testUser.username,
        progression: 0.385,
        cfi: 'epubcfi(/6/14[chapter-2]!/4/2/10/1:42)',
      });
    });

    it('broadcasts reading progress milestone updates', (done) => {
      socketClient.once('live_reading:participant_progress', (data: any) => {
        expect(data.userId).toBe(testUserId);
        expect(data.progression).toBe(0.42);
        done();
      });

      socketClient.emit('live_reading:update_progress', {
        sessionId,
        userId: testUserId,
        displayName: testUser.displayName,
        progression: 0.42,
        cfi: 'epubcfi(/6/16[chapter-3]!/4/2/2:0)',
      });
    });

    it('broadcasts live passage reactions to participants', (done) => {
      socketClient.once('live_reading:passage_reaction', (reaction: any) => {
        expect(reaction.userId).toBe(testUserId);
        expect(reaction.emoji).toBe('🔥');
        expect(reaction.quoteText).toBe('Fear is the mind-killer.');
        done();
      });

      socketClient.emit('live_reading:react_passage', {
        sessionId,
        userId: testUserId,
        displayName: testUser.displayName,
        emoji: '🔥',
        cfi: 'epubcfi(/6/16[chapter-3]!/4/2/2:0)',
        quoteText: 'Fear is the mind-killer.',
      });
    });

    it('leaves the live reading session cleanly', (done) => {
      socketClient.once('live_reading:user_left', (data: any) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.userId).toBe(testUserId);
        done();
      });

      socketClient.emit('live_reading:leave_session', {
        sessionId,
        userId: testUserId,
      });
    });
  });
});
