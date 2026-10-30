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

    /* Mobile Reader Showcase & Context Menu */
    .reader-showcase-container {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 48px;
      align-items: start;
      margin-bottom: 80px;
    }
    @media (max-width: 960px) {
      .reader-showcase-container {
        grid-template-columns: 1fr;
        justify-items: center;
      }
    }

    /* Mobile Phone Hardware Shell */
    .phone-frame {
      width: 100%;
      max-width: 410px;
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 36px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .phone-notch-bar {
      height: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 20px 0;
      font-size: 11px;
      font-weight: 600;
      color: var(--ink-secondary);
      background-color: var(--surface);
      font-family: var(--font-sans);
    }
    .notch-island {
      width: 60px;
      height: 12px;
      background-color: #E2E8F0;
      border-radius: 8px;
    }

    /* Mobile Reader Top App Bar */
    .reader-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      background-color: var(--surface);
    }
    .reader-bar-btn {
      background: none;
      border: none;
      color: var(--ink);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: var(--radius);
      line-height: 1;
    }
    .reader-bar-center {
      text-align: center;
    }
    .reader-bar-title {
      font-family: var(--font-serif);
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.2;
    }
    .reader-bar-community {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--accent);
      background-color: rgba(180, 83, 9, 0.08);
      padding: 2px 8px;
      border-radius: 12px;
      margin-top: 2px;
      font-weight: 600;
      font-family: var(--font-sans);
    }

    /* Ambient Progress Bar */
    .ambient-progress-track {
      position: relative;
      height: 22px;
      background-color: var(--surface-subtle);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
    }
    .ambient-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 64%;
      background-color: rgba(180, 83, 9, 0.12);
    }
    .ambient-pin {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: var(--ink-secondary);
      border: 2px solid var(--surface);
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      font-family: var(--font-sans);
    }
    .ambient-pin.pin-active {
      background-color: var(--accent);
      width: 28px;
      border-radius: 10px;
      font-size: 10px;
      z-index: 2;
    }
    .pin-pos-1 { left: 24%; }
    .pin-pos-2 { left: 45%; }
    .pin-pos-3 { left: 64%; }
    .pin-pos-4 { left: 82%; }

    /* Reading Canvas */
    .reader-body-well {
      padding: 24px 20px 16px;
      font-family: var(--font-serif);
      font-size: 16px;
      line-height: 1.7;
      color: var(--ink);
    }
    .reader-chapter-label {
      font-size: 12px;
      font-family: var(--font-sans);
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ink-tertiary);
      margin-bottom: 16px;
    }
    .passage-para {
      margin-bottom: 14px;
    }
    .highlight-active-span {
      background-color: rgba(180, 83, 9, 0.15);
      border-bottom: 2px solid var(--accent);
      padding: 2px 2px;
      border-radius: 2px;
    }
    .inline-margin-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background-color: var(--surface);
      border: 1px solid var(--border);
      color: var(--accent);
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-sans);
      padding: 1px 6px;
      border-radius: 10px;
      margin-left: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      vertical-align: middle;
      cursor: pointer;
    }

    /* PassageSelectionContextMenu (Exact Flutter port) */
    .passage-context-menu {
      border: 1px solid var(--border);
      border-radius: 16px;
      background-color: var(--surface);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin: 14px 0 16px;
    }
    .pcm-header {
      background-color: rgba(180, 83, 9, 0.08);
      border-left: 4px solid var(--accent);
      border-bottom: 1px solid var(--border);
      padding: 10px 12px;
    }
    .pcm-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .pcm-tag {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--accent);
      font-family: var(--font-sans);
    }
    .pcm-adjust-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pcm-adjust-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 7px;
      background-color: rgba(180, 83, 9, 0.12);
      border: 1px solid rgba(180, 83, 9, 0.28);
      border-radius: 12px;
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      font-family: var(--font-sans);
      cursor: pointer;
    }
    .pcm-close-btn {
      background: none;
      border: none;
      color: var(--ink-secondary);
      font-size: 13px;
      cursor: pointer;
      padding: 2px 4px;
      line-height: 1;
    }
    .pcm-quote-text {
      font-style: italic;
      font-size: 12px;
      line-height: 1.35;
      color: var(--ink);
      font-family: var(--font-serif);
    }
    .pcm-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 8px 6px;
      background-color: var(--surface);
    }
    .pcm-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: none;
      border: none;
      color: var(--ink);
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-sans);
      cursor: pointer;
      padding: 4px 6px;
    }
    .pcm-action-btn.primary {
      color: var(--accent);
    }
    .pcm-divider {
      width: 1px;
      height: 16px;
      background-color: var(--border);
    }

    /* Mobile Reader Bottom Footer */
    .reader-phone-footer {
      padding: 10px 16px 14px;
      border-top: 1px solid var(--border);
      background-color: var(--surface);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .reader-footer-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--ink-tertiary);
      font-family: var(--font-sans);
    }
    .home-indicator {
      width: 90px;
      height: 4px;
      background-color: #CBD5E1;
      border-radius: 2px;
      margin: 0 auto;
    }

    /* Companion Pane (Right Side on Desktop): Margin Thread */
    .reader-companion-pane {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 32px;
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
      border-left: 3px solid var(--accent);
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
    .cfi-callout-footer {
      margin-top: 20px;
      padding: 12px 14px;
      background-color: var(--surface-subtle);
      border-radius: var(--radius);
      font-size: 12px;
      color: var(--ink-secondary);
      line-height: 1.4;
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

    <!-- Mobile Reader & Passage Selection Preview -->
    <section id="reader" class="reader-showcase-container">
      <!-- Authentic Mobile Phone Frame -->
      <div class="phone-frame">
        <!-- Phone Status Bar -->
        <div class="phone-notch-bar">
          <span>9:41</span>
          <div class="notch-island"></div>
          <span>100%</span>
        </div>

        <!-- Mobile Top App Bar -->
        <div class="reader-top-bar">
          <button class="reader-bar-btn" title="Table of contents" aria-label="Table of contents">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div class="reader-bar-center">
            <div class="reader-bar-title">Dune</div>
            <div class="reader-bar-community">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>The Sci-Fi Collective &#9662;</span>
            </div>
          </div>
          <button class="reader-bar-btn" title="Reading settings" aria-label="Reading settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>

        <!-- Ambient Progress Bar -->
        <div class="ambient-progress-track" title="Real-time co-reading timeline">
          <div class="ambient-fill"></div>
          <div class="ambient-pin pin-pos-1" title="Marcus (24%)">M</div>
          <div class="ambient-pin pin-pos-2" title="Elena (45%)">E</div>
          <div class="ambient-pin pin-active pin-pos-3" title="You (Page 84 • 64%)">You</div>
          <div class="ambient-pin pin-pos-4" title="Priya (82%)">P</div>
        </div>

        <!-- Reading Canvas Surface -->
        <div class="reader-body-well">
          <div class="reader-chapter-label">Chapter IV &bull; Castle Caladan</div>

          <p class="passage-para">
            The room grew quiet as the gom jabbar remained steady at his neck. Paul remembered the old proverb whispered in the deep stone halls of Castle Caladan:
          </p>

          <p class="passage-para">
            <mark class="highlight-active-span">"I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear. I will permit it to pass over me and through me."</mark>
            <span class="inline-margin-badge" title="8 active comments on this sentence">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              8
            </span>
          </p>

          <!-- Floating PassageSelectionContextMenu (Exact App Match) -->
          <div class="passage-context-menu">
            <div class="pcm-header">
              <div class="pcm-top-row">
                <div class="pcm-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="14" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                  <span>SELECTED PASSAGE</span>
                </div>
                <div class="pcm-adjust-group">
                  <button class="pcm-adjust-chip" title="Shorten selection">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Shorten</span>
                  </button>
                  <button class="pcm-adjust-chip" title="Expand selection">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Expand</span>
                  </button>
                  <button class="pcm-close-btn" aria-label="Dismiss">&times;</button>
                </div>
              </div>
              <div class="pcm-quote-text">
                "I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration..."
              </div>
            </div>
            <div class="pcm-toolbar">
              <button class="pcm-action-btn primary" title="Start a passage thread">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="10" y1="10" x2="14" y2="10"></line></svg>
                <span>Start Thread</span>
              </button>
              <span class="pcm-divider"></span>
              <button class="pcm-action-btn" title="Rate this passage">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>Rate</span>
              </button>
              <span class="pcm-divider"></span>
              <button class="pcm-action-btn" title="Save quote">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>
                <span>Save</span>
              </button>
              <span class="pcm-divider"></span>
              <button class="pcm-action-btn" title="Highlight text">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h3l6-6"></path><path d="m22 12-4.6 4.6a2.78 2.78 0 0 1-3.9 0l-4.1-4.1a2.78 2.78 0 0 1 0-3.9L14 4"></path></svg>
                <span>Highlight</span>
              </button>
            </div>
          </div>

          <p class="passage-para">
            And when it has gone past I will turn the inner eye to see its path. Where the fear has gone there will be nothing. Only I will remain.
          </p>
        </div>

        <!-- Phone Reader Bottom Bar -->
        <div class="reader-phone-footer">
          <div class="reader-footer-info">
            <span>Chapter IV &bull; Page 84</span>
            <span>64% completed</span>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>

      <!-- Right Companion Column: In-Margin Discussion Drawer -->
      <div class="reader-companion-pane">
        <div>
          <div class="margin-header">
            <div class="margin-label">Active Margin Thread &bull; The Sci-Fi Collective</div>
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

        <div>
          <div class="reply-form">
            <input type="text" class="reply-input" value="It foreshadows the desert trials in part two." readonly>
            <button class="reply-submit">Send</button>
          </div>
          <div class="cfi-callout-footer">
            <strong>Sub-paragraph coordinate fidelity:</strong> Threads and highlights are anchored using EPUB CFI offsets. Everyone in the club sees identical passage highlights regardless of device or screen resolution.
          </div>
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
