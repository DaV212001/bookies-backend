# Bookies Backend 🚀📚

> High-performance NestJS 11 backend powering the **Bookies** social EPUB reading ecosystem. Features PostgreSQL with Prisma ORM, JWT & Google SSO authentication, dynamic catalog scraping and EPUB streaming, community moderation RBAC, and real-time Socket.IO live reading co-presence.

---

## 🌟 Architecture & Tech Stack

- **Framework**: [NestJS 11](https://nestjs.com/) (Node.js / TypeScript)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) with [Prisma ORM 6](https://www.prisma.io/)
- **Real-Time Engine**: [Socket.IO](https://socket.io/) Gateway for low-latency participant co-presence and live passage reactions
- **Authentication**: Passport.js with JWT Bearer Strategy & Google OAuth2 ID Token Verification
- **Catalog Worker**: Cheerio & Puppeteer Real-Browser scraper engine with local PostgreSQL caching & binary streaming
- **Testing**: Jest & Supertest automated end-to-end flow test suite

---

## 🏗️ Module Architecture

```
src/
├── auth/                 # Registration, login, Google SSO, JWT guards & strategies
│   ├── dto/              # LoginDto, RegisterDto, GoogleLoginDto
│   ├── guards/           # JwtAuthGuard
│   ├── strategies/       # JwtStrategy
│   ├── auth.controller.ts
│   └── auth.service.ts
├── catalog/              # Scraped catalog caching & EPUB binary streaming
│   ├── workers/          # OceanOfPDF scraper worker
│   ├── catalog.controller.ts
│   └── catalog.service.ts
├── communities/          # Community clubs, member roster & RBAC moderation
│   ├── communities.controller.ts
│   └── communities.service.ts
├── discussions/          # Discussion threads, chapter anchoring, chat & upvoting
│   ├── discussions.controller.ts
│   └── discussions.service.ts
├── live-sessions/        # Socket.IO live reading gateway & session management
│   ├── live-sessions.gateway.ts     # Real-time WebSocket Gateway
│   ├── live-sessions.controller.ts
│   └── live-sessions.service.ts
├── reading-progress/     # Reader CFI and progression percentage synchronization
│   ├── dto/              # SaveReadingProgressDto
│   ├── reading-progress.controller.ts
│   └── reading-progress.service.ts
├── prisma/               # PrismaService & lifecycle hooks
├── app.module.ts         # Root module definition
└── main.ts               # Global prefix (/api/v1), CORS & validation pipe
```

---

## 🗄️ Database Schema (Prisma)

The application models its relational data with strict constraints and foreign keys:

- **`User`**: Identity, credentials (bcrypt hash), display name, avatar URL, timestamps.
- **`CatalogBook`**: Scraped catalog metadata, active reader counter, cover URLs, local storage EPUB path.
- **`Community`**: Reading club metadata, linked book ID, creator foreign key.
- **`CommunityMember`**: Membership record with composite key (`[communityId, userId]`), role (`creator`, `admin`, `member`), status (`active`, `restricted`, `banned`), custom permissions array, and timed restriction expiration.
- **`Discussion`**: Topic threads anchored to books, chapters, or specific CFI passages.
- **`ChatMessage`**: Messages within discussion threads, supporting threaded replies.
- **`DiscussionReaction`**: Emoji reactions attached to chat messages.
- **`ReadingProgress`**: Unique per `[userId, bookId]` storing current CFI locator, progress fraction (0.0 to 1.0), and last updated timestamp.

---

## 📡 API Reference

All REST endpoints are prefixed with `/api/v1`.

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account with email and password | No |
| `POST` | `/api/v1/auth/login` | Authenticate user and receive JWT `accessToken` | No |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Bearer JWT |
| `POST` | `/api/v1/auth/google` | Google SSO login / provisioning | No |

### 📖 Discover & Catalog (`/api/v1/catalog`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/catalog/featured` | Fetch trending & curated books with download links | No |
| `GET` | `/api/v1/catalog/search?q=:query` | Search catalog by title, author, or keyword | No |
| `GET` | `/api/v1/catalog/:id` | Get book details enriched with download URL | No |
| `GET` | `/api/v1/catalog/:id/download` | Stream EPUB binary with attachment headers | No |

### 👥 Communities & Moderation (`/api/v1/communities`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/communities` | List all active reading communities | No |
| `GET` | `/api/v1/communities/:id` | Fetch specific community details | No |
| `POST` | `/api/v1/communities` | Create new community reading club | Bearer JWT |
| `POST` | `/api/v1/communities/:id/join` | Join community as a member | Bearer JWT |
| `POST` | `/api/v1/communities/:id/leave` | Leave community | Bearer JWT |
| `GET` | `/api/v1/communities/:id/members` | Retrieve member roster with roles & status | No |
| `PUT` | `/api/v1/communities/:id/members/:userId/role` | Promote/demote member role (`admin`, `member`) | Bearer JWT (Creator) |
| `POST` | `/api/v1/communities/:id/members/:userId/restrict` | Apply temporary or permanent restriction | Bearer JWT (Elevated) |
| `POST` | `/api/v1/communities/:id/members/:userId/unrestrict` | Lift member restriction | Bearer JWT (Elevated) |

### 💬 Discussions & Chat (`/api/v1/discussions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/discussions` | List discussions filtered by `bookId` or `communityId` | No |
| `GET` | `/api/v1/discussions/:id` | Get discussion details | No |
| `POST` | `/api/v1/discussions` | Create a new discussion thread | Bearer JWT |
| `POST` | `/api/v1/discussions/:id/upvote` | Upvote a discussion thread | No |
| `GET` | `/api/v1/discussions/:id/messages` | Get paginated chat messages for discussion | No |
| `POST` | `/api/v1/discussions/:id/messages` | Post a chat message reply in thread | Bearer JWT |

### 📍 Reading Progress (`/api/v1/reading-progress`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/reading-progress` | Save/upsert CFI location and progression percentage | Bearer JWT |
| `GET` | `/api/v1/reading-progress` | Get all saved reading progression records for user | Bearer JWT |
| `GET` | `/api/v1/reading-progress/:bookId` | Get user reading progress for specific book | Bearer JWT |

---

## ⚡ Real-Time Live Reading Protocol (Socket.IO)

The WebSocket gateway enables co-presence without audio interference:

### Client $\rightarrow$ Server Events

- **`live_reading:join_session`**: Joins room `session:{sessionId}`.
  ```json
  {
    "sessionId": "comm-dune-club",
    "userId": "user-uuid",
    "displayName": "Paul Atreides",
    "username": "paul",
    "avatarUrl": "https://...",
    "progression": 0.25,
    "cfi": "epubcfi(/6/12[chap3]!/4/2:10)"
  }
  ```
- **`live_reading:update_progress`**: Broadcasts reader milestone movement.
  ```json
  {
    "sessionId": "comm-dune-club",
    "userId": "user-uuid",
    "displayName": "Paul Atreides",
    "progression": 0.35,
    "cfi": "epubcfi(/6/14[chap4]!/4/2:0)"
  }
  ```
- **`live_reading:react_passage`**: Emits floating emoji reaction to a paragraph.
  ```json
  {
    "sessionId": "comm-dune-club",
    "userId": "user-uuid",
    "displayName": "Paul Atreides",
    "emoji": "🔥",
    "cfi": "epubcfi(/6/14[chap4]!/4/2:0)",
    "quoteText": "Fear is the mind-killer."
  }
  ```
- **`live_reading:leave_session`**: Leaves reading room cleanly.

### Server $\rightarrow$ Client Broadcasts

- **`live_reading:session_roster`**: Returns full list of active participants to joining client.
- **`live_reading:user_joined`**: Notifies room of a new reader.
- **`live_reading:participant_progress`**: Broadcasts updated progression and CFI to all readers.
- **`live_reading:passage_reaction`**: Broadcasts live floating reaction to all readers.
- **`live_reading:user_left`**: Broadcasts participant departure.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 20.x`
- **npm**: `>= 10.x`
- **PostgreSQL 16**: Running on port `5432`

### 1. Installation

```bash
cd bookies-backend
npm install
```

### 2. Environment Variables

Create `.env` based on `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookies?schema=public"
JWT_SECRET="super-secret-jwt-key-change-in-production"
PORT=3000
OCEANOFPDF_BASE_URL="https://oceanofpdf.com"
```

### 3. Database Migrations & Seeding

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run start:dev
```

The server will listen at `http://localhost:3000/api/v1`.

---

## 🧪 Testing

The backend includes a comprehensive end-to-end integration test suite exercising HTTP endpoints and real-time Socket.IO events against PostgreSQL:

```bash
npm run test:e2e
```

**Output**:
```
PASS test/full_flows.e2e-spec.ts (11.416 s)
  Bookies Backend - Full End-to-End Flow Tests
    Flow 1: Authentication & User Profiles (5 passed)
    Flow 2: Discover & Book Catalog (3 passed)
    Flow 3: Community Lifecycle & Moderation RBAC (7 passed)
    Flow 4: Discussions & Community Threading (3 passed)
    Flow 5: Reading Progress Persistence (2 passed)
    Flow 6: Real-time Live Reading Socket.IO Gateway (4 passed)

Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
```

---

## 📄 License

MIT License.
