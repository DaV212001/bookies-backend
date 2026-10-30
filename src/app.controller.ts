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
   * Public landing page for Bookies.
   */
  @Get(['', 'home'])
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookies: Social Reading and Book Clubs</title>
  <meta name="description" content="Bookies connects readers through synchronized timelines, in-margin passage discussions, quote cards, and shared reading for book clubs.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canvas: #FBF9F5;
      --surface: #FFFFFF;
      --surface-subtle: #F3EFE9;
      --ink: #1F1B18;
      --ink-secondary: #5C524B;
      --ink-tertiary: #8C8077;
      --border: #E4DCD3;
      --border-focus: #1F1B18;
      --accent: #8F3926;
      --accent-hover: #722B1B;
      --radius: 6px;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Navigation */
    header {
      background-color: var(--canvas);
      border-bottom: 1px solid var(--border);
    }
    .header-inner {
      max-width: 1120px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--ink);
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      background-color: var(--accent);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-family: var(--font-serif);
      font-weight: 700;
      font-size: 16px;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    nav {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    nav a {
      color: var(--ink-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    nav a:hover {
      color: var(--accent);
    }
    .nav-cta {
      padding: 8px 16px;
      border-radius: var(--radius);
      background-color: var(--accent);
      color: #FFFFFF !important;
      font-weight: 600;
      transition: background-color 0.15s ease;
    }
    .nav-cta:hover {
      background-color: var(--accent-hover);
    }

    /* Main container */
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 64px 24px 96px;
    }

    /* Hero section */
    .hero {
      max-width: 780px;
      margin: 0 auto 64px;
      text-align: center;
    }
    .hero h1 {
      font-family: var(--font-serif);
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
      color: var(--ink);
    }
    .hero-summary {
      font-size: 18px;
      line-height: 1.6;
      color: var(--ink-secondary);
      margin-bottom: 32px;
    }
    .cta-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: var(--radius);
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .btn-primary {
      background-color: var(--accent);
      color: #FFFFFF;
      border-color: var(--accent);
    }
    .btn-primary:hover {
      background-color: var(--accent-hover);
      border-color: var(--accent-hover);
    }
    .btn-secondary {
      background-color: var(--surface);
      color: var(--ink);
      border-color: var(--border);
    }
    .btn-secondary:hover {
      border-color: var(--border-focus);
    }

    /* Live reader mockup: Two columns representing tablet view */
    .reader-mockup {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background-color: var(--surface);
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      margin-bottom: 80px;
    }
    @media (max-width: 860px) {
      .reader-mockup {
        grid-template-columns: 1fr;
      }
    }

    /* Left pane: Reading surface */
    .reader-text-pane {
      padding: 40px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media (max-width: 860px) {
      .reader-text-pane {
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
    }
    .reader-meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--ink-tertiary);
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .reader-chapter-title {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 20px;
    }
    .book-passage {
      font-family: var(--font-serif);
      font-size: 18px;
      line-height: 1.8;
      color: var(--ink);
    }
    .book-passage p {
      margin-bottom: 16px;
    }
    .highlighted-text {
      background-color: #F8E6DE;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .reader-action-toolbar {
      display: flex;
      gap: 8px;
      margin: 16px 0;
    }
    .toolbar-chip {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: var(--radius);
      background-color: var(--ink);
      color: #FFFFFF;
      border: none;
      cursor: pointer;
    }
    .toolbar-chip.secondary {
      background-color: var(--surface-subtle);
      color: var(--ink);
      border: 1px solid var(--border);
    }

    /* Bottom scrubber track */
    .scrubber-module {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .scrubber-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--ink-secondary);
      margin-bottom: 8px;
      font-weight: 500;
    }
    .scrubber-line {
      position: relative;
      height: 4px;
      background-color: var(--border);
      border-radius: 2px;
      margin-bottom: 8px;
    }
    .scrubber-progress {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 62%;
      background-color: var(--accent);
      border-radius: 2px;
    }
    .scrubber-pin {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 18px;
      height: 18px;
      border-radius: var(--radius);
      background-color: var(--ink);
      border: 2px solid var(--surface);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pin-a { left: 32%; }
    .pin-b { left: 50%; }
    .pin-user { left: 62%; background-color: var(--accent); }
    .pin-c { left: 84%; }

    /* Right pane: Margin discussion */
    .reader-margin-pane {
      padding: 32px;
      background-color: var(--surface);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .margin-header {
      margin-bottom: 20px;
    }
    .margin-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ink-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .margin-title {
      font-family: var(--font-serif);
      font-size: 18px;
      font-weight: 600;
      color: var(--ink);
    }
    .selected-quote-callout {
      padding: 12px 16px;
      background-color: var(--surface-subtle);
      border-radius: var(--radius);
      font-family: var(--font-serif);
      font-size: 14px;
      line-height: 1.5;
      color: var(--ink-secondary);
      margin-bottom: 24px;
    }
    .thread-entry {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
    }
    .entry-author {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink);
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .entry-time {
      font-size: 12px;
      font-weight: 400;
      color: var(--ink-tertiary);
    }
    .entry-body {
      font-size: 14px;
      line-height: 1.5;
      color: var(--ink-secondary);
    }
    .entry-meta {
      margin-top: 10px;
      font-size: 12px;
      color: var(--ink-tertiary);
      display: flex;
      gap: 12px;
    }
    .reply-form {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .reply-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      background-color: var(--surface-subtle);
      color: var(--ink);
      outline: none;
    }
    .reply-input:focus {
      border-color: var(--border-focus);
      background-color: var(--surface);
    }
    .reply-submit {
      padding: 10px 18px;
      border-radius: var(--radius);
      background-color: var(--accent);
      color: #FFFFFF;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Feature sections: direct two-column layout */
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 64px;
      margin-bottom: 96px;
    }
    .feature-row {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 48px;
      align-items: start;
      border-top: 1px solid var(--border);
      padding-top: 32px;
    }
    @media (max-width: 768px) {
      .feature-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
    .feature-heading {
      font-family: var(--font-serif);
      font-size: 24px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.3;
    }
    .feature-description {
      font-size: 16px;
      color: var(--ink-secondary);
      line-height: 1.7;
    }
    .feature-spec {
      margin-top: 16px;
      padding: 16px;
      border-radius: var(--radius);
      background-color: var(--surface);
      border: 1px solid var(--border);
      font-size: 14px;
      color: var(--ink);
    }

    /* Reading clubs section */
    .clubs-section {
      border-top: 1px solid var(--border);
      padding-top: 64px;
      margin-bottom: 96px;
    }
    .section-title {
      font-family: var(--font-serif);
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--ink);
    }
    .section-lead {
      font-size: 16px;
      color: var(--ink-secondary);
      margin-bottom: 32px;
    }
    .clubs-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background-color: var(--surface);
      font-size: 14px;
    }
    .clubs-table th {
      text-align: left;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      color: var(--ink-tertiary);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .clubs-table td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border);
      color: var(--ink);
    }
    .clubs-table tr:last-child td {
      border-bottom: none;
    }
    .club-name {
      font-weight: 600;
      color: var(--ink);
    }
    .club-book {
      color: var(--ink-secondary);
      font-family: var(--font-serif);
      font-size: 15px;
    }

    /* FAQ section */
    .faq-section {
      border-top: 1px solid var(--border);
      padding-top: 64px;
      margin-bottom: 96px;
    }
    .faq-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
      margin-top: 32px;
    }
    @media (max-width: 768px) {
      .faq-grid {
        grid-template-columns: 1fr;
      }
    }
    .faq-item h3 {
      font-family: var(--font-serif);
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--ink);
    }
    .faq-item p {
      font-size: 14px;
      line-height: 1.6;
      color: var(--ink-secondary);
    }

    /* Download Banner */
    .download-banner {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 48px 32px;
      text-align: center;
      margin-bottom: 64px;
    }
    .download-banner h2 {
      font-family: var(--font-serif);
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--ink);
    }
    .download-banner p {
      font-size: 16px;
      color: var(--ink-secondary);
      margin-bottom: 24px;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      background-color: var(--surface-subtle);
      padding: 40px 24px;
      font-size: 13px;
      color: var(--ink-secondary);
    }
    .footer-inner {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .footer-links {
      display: flex;
      gap: 20px;
    }
    .footer-links a {
      color: var(--ink-secondary);
      text-decoration: none;
    }
    .footer-links a:hover {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="/home" class="brand">
        <div class="brand-mark">B</div>
        <div class="brand-name">Bookies</div>
      </a>
      <nav>
        <a href="#reader">Reader</a>
        <a href="#features">Features</a>
        <a href="#clubs">Clubs</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="#download" class="nav-cta">Download</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <h1>A shared reading application for book clubs and margin discussions</h1>
      <p class="hero-summary">
        Bookies connects readers through synchronized timelines, in-margin passage discussions, and live co-presence inside standard EPUB texts.
      </p>
      <div class="cta-row">
        <a href="#download" class="btn btn-primary">Download for Android</a>
        <a href="#download" class="btn btn-secondary">Download for iOS</a>
      </div>
    </section>

    <!-- Tablet reader preview -->
    <section id="reader" class="reader-mockup">
      <div class="reader-text-pane">
        <div>
          <div class="reader-meta-bar">
            <span>Dune by Frank Herbert</span>
            <span>Chapter 4, Page 84</span>
          </div>

          <div class="reader-chapter-title">The Litany Against Fear</div>

          <div class="book-passage">
            <p>
              The room grew quiet as the gom jabbar remained steady at his neck. Paul remembered the old proverb whispered in the deep stone halls of Castle Caladan.
            </p>
            <p>
              <span class="highlighted-text">I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear. I will permit it to pass over me and through me.</span>
            </p>
            <div class="reader-action-toolbar">
              <button class="toolbar-chip">Start discussion (8)</button>
              <button class="toolbar-chip secondary">Save quote</button>
              <button class="toolbar-chip secondary">Highlight</button>
            </div>
            <p>
              And when it has gone past I will turn the inner eye to see its path. Where the fear has gone there will be nothing. Only I will remain.
            </p>
          </div>
        </div>

        <div class="scrubber-module">
          <div class="scrubber-header">
            <span>Chapter 4 progress</span>
            <span>4 members currently active</span>
          </div>
          <div class="scrubber-line">
            <div class="scrubber-progress"></div>
            <div class="scrubber-pin pin-a" title="Marcus">M</div>
            <div class="scrubber-pin pin-b" title="Elena">E</div>
            <div class="scrubber-pin pin-user" title="You (Page 84)">You</div>
            <div class="scrubber-pin pin-c" title="Priya">P</div>
          </div>
        </div>
      </div>

      <div class="reader-margin-pane">
        <div>
          <div class="margin-header">
            <div class="margin-label">Margin thread</div>
            <div class="margin-title">The Litany as Psychological Anchor</div>
          </div>

          <div class="selected-quote-callout">
            "I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration."
          </div>

          <div class="thread-entry">
            <div class="entry-author">
              <span>Elena Vance</span>
              <span class="entry-time">12 minutes ago</span>
            </div>
            <div class="entry-body">
              Notice how Herbert treats fear as an external weather condition rather than an internal failing. You allow it to pass through rather than resisting it directly.
            </div>
            <div class="entry-meta">
              <span>14 reactions</span>
              <span>4 replies</span>
            </div>
          </div>

          <div class="thread-entry">
            <div class="entry-author">
              <span>Marcus Cole</span>
              <span class="entry-time">4 minutes ago</span>
            </div>
            <div class="entry-body">
              This connects directly to the prana-bindu control exercises introduced in chapter 2.
            </div>
            <div class="entry-meta">
              <span>6 reactions</span>
            </div>
          </div>
        </div>

        <div class="reply-form">
          <input type="text" class="reply-input" value="It foreshadows the desert trials in part two." readonly>
          <button class="reply-submit">Send</button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="feature-list">
      <div class="feature-row">
        <h2 class="feature-heading">In-margin sentence discussions</h2>
        <div>
          <p class="feature-description">
            Conversations remain anchored to the exact sentence or paragraph that prompted them. When you select a phrase, you can open a thread that stays linked to that passage for all members of your club.
          </p>
          <div class="feature-spec">
            <strong>Location fidelity:</strong> Uses canonical EPUB CFI coordinates so highlights and threads match across different screen sizes and font settings.
          </div>
        </div>
      </div>

      <div class="feature-row">
        <h2 class="feature-heading">Synchronized reading presence</h2>
        <div>
          <p class="feature-description">
            The progress scrubber at the base of the reader shows where club members are located within the current chapter. You can see when fellow members are reading at the same time.
          </p>
          <div class="feature-spec">
            <strong>Co-presence:</strong> Progress markers update smoothly through low-latency socket events.
          </div>
        </div>
      </div>

      <div class="feature-row">
        <h2 class="feature-heading">Progressive spoiler protection</h2>
        <div>
          <p class="feature-description">
            Club members read at different speeds. Margin notes and thread discussions for future chapters remain hidden until you reach that chapter yourself, protecting your reading experience.
          </p>
          <div class="feature-spec">
            <strong>Pacing:</strong> Set weekly chapter goals to guide group discussions.
          </div>
        </div>
      </div>

      <div class="feature-row">
        <h2 class="feature-heading">Formatted quote cards</h2>
        <div>
          <p class="feature-description">
            Save memorable sentences to your personal archive as formatted passage cards with complete book and chapter attribution.
          </p>
          <div class="feature-spec">
            <strong>Export:</strong> Copy passages or save them as clean typographical cards.
          </div>
        </div>
      </div>
    </section>

    <!-- Book clubs -->
    <section id="clubs" class="clubs-section">
      <h2 class="section-title">Active reading clubs</h2>
      <p class="section-lead">Join an open community or create a private circle for your friends.</p>

      <table class="clubs-table">
        <thead>
          <tr>
            <th>Club</th>
            <th>Current book</th>
            <th>Pacing goal</th>
            <th>Members</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="club-name">The Speculative Fiction Circle</td>
            <td class="club-book">Dune by Frank Herbert</td>
            <td>Chapters 12 to 16 by Sunday</td>
            <td>24 active</td>
          </tr>
          <tr>
            <td class="club-name">Modern Fiction Group</td>
            <td class="club-book">Tomorrow, and Tomorrow, and Tomorrow</td>
            <td>Act 2, Chapters 6 to 9</td>
            <td>38 active</td>
          </tr>
          <tr>
            <td class="club-name">Nineteenth Century Classics</td>
            <td class="club-book">Frankenstein by Mary Shelley</td>
            <td>Volume 2, Chapters 1 to 5</td>
            <td>19 active</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
      <h2 class="section-title">Frequently asked questions</h2>
      <div class="faq-grid">
        <div class="faq-item">
          <h3>Can I bring my own EPUB files?</h3>
          <p>
            Yes. Bookies supports standard DRM-free EPUB files. You can upload books from your local device or cloud storage.
          </p>
        </div>
        <div class="faq-item">
          <h3>Are book clubs private?</h3>
          <p>
            You can create invite-only clubs with private links, or open public clubs visible to the community.
          </p>
        </div>
        <div class="faq-item">
          <h3>What data does Bookies store?</h3>
          <p>
            We store only your account email, display name, reading locations, and notes you post. We do not sell data or run advertising trackers.
          </p>
        </div>
        <div class="faq-item">
          <h3>How do I authenticate?</h3>
          <p>
            You can sign in securely using Google Sign-In or your personal email address.
          </p>
        </div>
      </div>
    </section>

    <!-- Download banner -->
    <section id="download" class="download-banner">
      <h2>Get started with Bookies</h2>
      <p>Download the application on Android or iOS to join your first reading circle.</p>
      <div class="cta-row">
        <a href="#" class="btn btn-primary">Android APK / Play Store</a>
        <a href="#" class="btn btn-secondary">Apple App Store</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="footer-inner">
      <div>&copy; ${new Date().getFullYear()} Bookies. All rights reserved.</div>
      <div class="footer-links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>
      </div>
    </div>
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
  <title>Privacy Policy: Bookies</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canvas: #FBF9F5;
      --surface: #FFFFFF;
      --surface-subtle: #F3EFE9;
      --ink: #1F1B18;
      --ink-secondary: #5C524B;
      --border: #E4DCD3;
      --accent: #8F3926;
      --radius: 6px;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.7;
      font-size: 16px;
    }
    header {
      background-color: var(--canvas);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
    }
    .header-inner {
      max-width: 840px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--ink);
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      background-color: var(--accent);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-family: var(--font-serif);
      font-weight: 700;
      font-size: 16px;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 700;
    }
    nav a {
      color: var(--ink-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    nav a:hover { color: var(--accent); }
    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--ink);
    }
    .effective-date {
      color: var(--ink-secondary);
      font-size: 14px;
      margin-bottom: 32px;
    }
    .policy-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px;
    }
    h2 {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 600;
      margin-top: 28px;
      margin-bottom: 12px;
      color: var(--ink);
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }
    h2:first-of-type { margin-top: 0; }
    p, ul {
      color: var(--ink-secondary);
      margin-bottom: 16px;
      font-size: 15px;
    }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    strong { color: var(--ink); }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer {
      border-top: 1px solid var(--border);
      background-color: var(--surface-subtle);
      padding: 24px;
      font-size: 13px;
      color: var(--ink-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="/home" class="brand">
        <div class="brand-mark">B</div>
        <div class="brand-name">Bookies</div>
      </a>
      <nav>
        <a href="/home">Back to Home</a>
      </nav>
    </div>
  </header>

  <div class="container">
    <h1>Privacy Policy</h1>
    <div class="effective-date">Effective Date: October 30, 2026</div>

    <div class="policy-card">
      <h2>1. Introduction</h2>
      <p>
        Bookies provides social e-reader tools and shared reading communities. This policy explains what information is collected, how it is handled, and your rights regarding that information when using our mobile applications and related web services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We collect only the data required to support reader synchronization and community features:</p>
      <ul>
        <li><strong>Google OAuth Account Information:</strong> When signing in with Google, we receive your email address, display name, and avatar URL. We use this strictly to identify your account and display your reader profile.</li>
        <li><strong>Reading Progress and Annotations:</strong> We store your reading locations (EPUB CFI locators), reading percentages, margin notes, and thread comments.</li>
        <li><strong>Book Club Memberships:</strong> Information about the clubs you create or join and your participation records.</li>
      </ul>

      <h2>3. How We Use Information</h2>
      <p>We use this data solely to provide core features:</p>
      <ul>
        <li>Authenticating your session across devices.</li>
        <li>Synchronizing your reading position with your book clubs.</li>
        <li>Delivering real-time margin notes to other members of your club.</li>
        <li>We do not sell, rent, or share personal information with third-party advertising networks.</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        All traffic between client devices and our servers is encrypted using Transport Layer Security (HTTPS/TLS). Sensitive credentials and access tokens are secured using platform keystores.
      </p>

      <h2>5. Google API Services Compliance</h2>
      <p>
        Bookies adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements. We request only the standard identity scopes (email, profile, openid).
      </p>

      <h2>6. Account Deletion and Data Rights</h2>
      <p>
        You have the right to request a copy of your stored notes or to delete your account entirely. You can initiate deletion directly in the application settings or by contacting our team.
      </p>

      <h2>7. Contact Information</h2>
      <p>
        For inquiries regarding this privacy policy or your data, contact:<br>
        Email: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>
      </p>
    </div>
  </div>

  <footer>
    &copy; ${new Date().getFullYear()} Bookies. All rights reserved. &bull; <a href="/home">Home</a> &bull; <a href="/terms">Terms of Service</a> &bull; Support: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>
  </footer>
</body>
</html>`;
  }

  /**
   * Public Terms of Service page.
   */
  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getTermsPage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service: Bookies</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canvas: #FBF9F5;
      --surface: #FFFFFF;
      --surface-subtle: #F3EFE9;
      --ink: #1F1B18;
      --ink-secondary: #5C524B;
      --border: #E4DCD3;
      --accent: #8F3926;
      --radius: 6px;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.7;
      font-size: 16px;
    }
    header {
      background-color: var(--canvas);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
    }
    .header-inner {
      max-width: 840px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--ink);
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      background-color: var(--accent);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-family: var(--font-serif);
      font-weight: 700;
      font-size: 16px;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 700;
    }
    nav a {
      color: var(--ink-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    nav a:hover { color: var(--accent); }
    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--ink);
    }
    .effective-date {
      color: var(--ink-secondary);
      font-size: 14px;
      margin-bottom: 32px;
    }
    .terms-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px;
    }
    h2 {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 600;
      margin-top: 28px;
      margin-bottom: 12px;
      color: var(--ink);
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }
    h2:first-of-type { margin-top: 0; }
    p, ul {
      color: var(--ink-secondary);
      margin-bottom: 16px;
      font-size: 15px;
    }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    strong { color: var(--ink); }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer {
      border-top: 1px solid var(--border);
      background-color: var(--surface-subtle);
      padding: 24px;
      font-size: 13px;
      color: var(--ink-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="/home" class="brand">
        <div class="brand-mark">B</div>
        <div class="brand-name">Bookies</div>
      </a>
      <nav>
        <a href="/home">Back to Home</a>
      </nav>
    </div>
  </header>

  <div class="container">
    <h1>Terms of Service</h1>
    <div class="effective-date">Effective Date: October 30, 2026</div>

    <div class="terms-card">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the Bookies mobile applications and related web services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should not access or use the service.
      </p>

      <h2>2. User Accounts and Eligibility</h2>
      <p>
        To access community features and margin synchronization, you must register for an account using Google authentication or email. You are responsible for safeguarding your login credentials and for all activities that occur under your account.
      </p>

      <h2>3. Intellectual Property and Content</h2>
      <p>
        You retain ownership of any margin comments, notes, and discussion entries you author. By posting in a public or shared book club, you grant Bookies a non-exclusive license to display your notes to fellow members of that club.
      </p>
      <p>
        You are responsible for ensuring that any EPUB files you import into your personal account do not infringe on copyright or third-party rights.
      </p>

      <h2>4. Community Standards</h2>
      <p>
        Users agree not to post content that is unlawful, abusive, harassing, defamatory, or invasive of another person's privacy. Clubs that violate community safety standards may be removed.
      </p>

      <h2>5. Service Availability</h2>
      <p>
        We aim for continuous service availability, but we do not guarantee uninterrupted operation. We may modify or update the service as necessary to address security or performance needs.
      </p>

      <h2>6. Contact</h2>
      <p>
        For inquiries regarding these terms, contact us at: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>.
      </p>
    </div>
  </div>

  <footer>
    &copy; ${new Date().getFullYear()} Bookies. All rights reserved. &bull; <a href="/home">Home</a> &bull; <a href="/privacy">Privacy Policy</a> &bull; Support: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>
  </footer>
</body>
</html>`;
  }
}
