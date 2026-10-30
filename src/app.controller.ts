import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health check endpoint for UptimeRobot & Render keepalive.
   * Touches the database with a lightweight 'SELECT 1' to keep Supabase active.
   */
  @Get(['health', 'api/v1/health'])
  async getHealth() {
    const startTime = Date.now();
    let dbStatus = 'connected';
    let dbError: string | null = null;
    let latencyMs = 0;

    try {
      // Lightweight query touching Supabase/Postgres to keep the instance unpaused
      await this.prisma.$queryRawUnsafe('SELECT 1');
      latencyMs = Date.now() - startTime;
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err?.message || 'Database query failed';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbStatus === 'connected' ? latencyMs : undefined,
        ...(dbError ? { error: dbError } : {}),
      },
      service: 'bookies-backend',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }

  /**
   * Public landing page for Google OAuth verification and users.
   */
  @Get(['', 'home'])
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookies - Social EPUB Reader & Reading Clubs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-midnight: #091426;
      --bg-surface: #0f1d33;
      --bg-card: #15243d;
      --accent-terracotta: #FD8A42;
      --accent-leather: #9B4500;
      --text-primary: #F8F9FF;
      --text-secondary: #94A3B8;
      --border-subtle: #1E293B;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-midnight);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-primary);
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-leather), var(--accent-terracotta));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-serif);
      font-weight: 700;
      font-size: 1.3rem;
      color: white;
      box-shadow: 0 4px 12px rgba(155, 69, 0, 0.3);
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    nav a {
      color: var(--text-secondary);
      text-decoration: none;
      margin-left: 1.5rem;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    nav a:hover { color: var(--accent-terracotta); }
    main {
      flex: 1;
      max-width: 1040px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      background: rgba(253, 138, 66, 0.12);
      color: var(--accent-terracotta);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(253, 138, 66, 0.25);
    }
    h1 {
      font-family: var(--font-serif);
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 1.5rem;
      color: #FFFFFF;
    }
    h1 span {
      background: linear-gradient(135deg, #FFF, var(--accent-terracotta));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-p {
      font-size: 1.2rem;
      color: var(--text-secondary);
      max-width: 680px;
      margin: 0 auto 3rem auto;
      font-weight: 400;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.75rem;
      text-align: left;
      margin-top: 2rem;
    }
    .feature-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 2rem;
      transition: transform 0.2s, border-color 0.2s;
    }
    .feature-card:hover {
      transform: translateY(-3px);
      border-color: rgba(253, 138, 66, 0.4);
    }
    .feature-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    .feature-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #FFFFFF;
    }
    .feature-desc {
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.55;
    }
    .cta-group {
      margin-top: 3.5rem;
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.75rem;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      font-size: 0.95rem;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-leather), var(--accent-terracotta));
      color: white;
      box-shadow: 0 4px 14px rgba(155, 69, 0, 0.35);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
    }
    .btn-secondary:hover {
      border-color: var(--text-secondary);
    }
    footer {
      border-top: 1px solid var(--border-subtle);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    footer a {
      color: var(--accent-terracotta);
      text-decoration: none;
    }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <a href="/home" class="brand">
      <div class="brand-icon">B</div>
      <div class="brand-name">Bookies</div>
    </a>
    <nav>
      <a href="/home">Home</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/health">System Status</a>
    </nav>
  </header>

  <main>
    <div class="badge">Social EPUB Reader & Book Clubs</div>
    <h1>A Sanctuary for Readers &<br><span>Their Communities</span></h1>
    <p class="hero-p">
      Read together, discuss passages directly in the margins, and experience synchronous book club co-presence with clean editorial typography.
    </p>

    <div class="cta-group">
      <a href="/privacy" class="btn btn-secondary">Review Privacy Policy</a>
      <a href="/health" class="btn btn-secondary">API Health Check</a>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">📖</div>
        <div class="feature-title">Connected Book Clubs</div>
        <div class="feature-desc">Form private or public reading communities, invite fellow bibliophiles, and track member reading progress together.</div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">💬</div>
        <div class="feature-title">Margin Passage Threads</div>
        <div class="feature-desc">Anchor conversations to specific sentences and CFI markers. Discuss spoilers with built-in spoiler tags.</div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">✨</div>
        <div class="feature-title">Live Co-Presence & Sync</div>
        <div class="feature-desc">See where club members are in real time with ambient reader tracks and synchronous page reactions.</div>
      </div>
    </div>
  </main>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Bookies. All rights reserved. &bull; <a href="/privacy">Privacy Policy</a> &bull; <a href="/health">Health</a></p>
  </footer>
</body>
</html>`;
  }

  /**
   * Public Privacy Policy page for Google OAuth Verification & App Stores.
   */
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getPrivacyPage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Bookies</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-midnight: #091426;
      --bg-surface: #0f1d33;
      --bg-card: #15243d;
      --accent-terracotta: #FD8A42;
      --text-primary: #F8F9FF;
      --text-secondary: #94A3B8;
      --border-subtle: #1E293B;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-midnight);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-primary);
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: linear-gradient(135deg, #9B4500, var(--accent-terracotta));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-serif);
      font-weight: 700;
      color: white;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 1.4rem;
      font-weight: 700;
    }
    nav a {
      color: var(--text-secondary);
      text-decoration: none;
      margin-left: 1.5rem;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    nav a:hover { color: var(--accent-terracotta); }
    .container {
      max-width: 820px;
      margin: 0 auto;
      padding: 3.5rem 1.5rem;
      flex: 1;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .last-updated {
      color: var(--accent-terracotta);
      font-size: 0.9rem;
      margin-bottom: 2.5rem;
      font-weight: 500;
    }
    .card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 2.5rem;
      margin-bottom: 2rem;
    }
    h2 {
      font-family: var(--font-serif);
      font-size: 1.5rem;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
      color: #FFFFFF;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.4rem;
    }
    h2:first-of-type { margin-top: 0; }
    p, ul {
      color: var(--text-secondary);
      margin-bottom: 1rem;
      font-size: 1rem;
    }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    strong { color: var(--text-primary); }
    a { color: var(--accent-terracotta); }
    footer {
      border-top: 1px solid var(--border-subtle);
      padding: 2rem 1.5rem;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <header>
    <a href="/home" class="brand">
      <div class="brand-icon">B</div>
      <div class="brand-name">Bookies</div>
    </a>
    <nav>
      <a href="/home">&larr; Back to Home</a>
      <a href="/health">Health</a>
    </nav>
  </header>

  <div class="container">
    <h1>Privacy Policy</h1>
    <div class="last-updated">Effective Date: October 30, 2026</div>

    <div class="card">
      <h2>1. Introduction</h2>
      <p>
        Welcome to <strong>Bookies</strong> ("we", "our", or "us"). We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner. This Privacy Policy details our practices concerning data collection, usage, and protection when you use the Bookies mobile applications and associated cloud backend services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We only collect information necessary to provide you with social reading and synchronized book club features:</p>
      <ul>
        <li><strong>Google OAuth Account Information:</strong> When you choose to authenticate via Google Sign-In, we receive your verified email address, full name / display name, and avatar picture URL. We use this strictly to provision your reader profile.</li>
        <li><strong>Reading Progress & Annotations:</strong> We store your reading locations (EPUB CFI locators), reading progression percentages, margin comments, passage discussions, and live reading co-presence indicators.</li>
        <li><strong>Community & Club Memberships:</strong> Information about the book clubs and discussion groups you create or join.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>Your data is used strictly to power core app functionality:</p>
      <ul>
        <li>Authenticating your session securely across devices.</li>
        <li>Synchronizing your reading position with your book clubs.</li>
        <li>Delivering real-time co-presence and live passage reactions to fellow club members.</li>
        <li>We <strong>NEVER</strong> sell, rent, monetize, or share your personal information with third-party advertising brokers.</li>
      </ul>

      <h2>4. Data Storage, Security & Encryption</h2>
      <p>
        All communications between your device and our servers are encrypted using Transport Layer Security (HTTPS/TLS). Sensitive access tokens are stored securely in hardware-backed platform keystores (Android Keystore / iOS Keychain). Backend database connections are strictly authenticated and encrypted.
      </p>

      <h2>5. Google User Data Policy Compliance</h2>
      <p>
        Bookies' use and transfer to any other app of information received from Google APIs will adhere to the 
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements. We request only the minimum necessary Google scopes (<code>email</code>, <code>profile</code>, <code>openid</code>).
      </p>

      <h2>6. Your Rights & Account Deletion</h2>
      <p>
        You retain full control over your personal data. You may request the export or complete deletion of your account, annotations, and reading history at any time by contacting our support team or initiating deletion from within the app settings.
      </p>

      <h2>7. Contact Information</h2>
      <p>
        If you have any questions or concerns regarding this Privacy Policy or our security practices, please contact us at:<br>
        <strong>Email:</strong> <a href="mailto:support@bookies.app">support@bookies.app</a>
      </p>
    </div>
  </div>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Bookies. All rights reserved. &bull; <a href="/home">Home</a> &bull; <a href="/health">System Status</a></p>
  </footer>
</body>
</html>`;
  }
}
