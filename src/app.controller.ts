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
   * Public landing page for Bookies — a social EPUB reader & book club community.
   */
  @Get(['', 'home'])
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookies — Social Reading & Book Clubs</title>
  <meta name="description" content="Bookies connects readers through synchronized timelines, in-margin passage discussions, quote cards, and quiet co-presence for book clubs.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canvas: #FAF7F2;
      --canvas-surface: #FFFFFF;
      --canvas-muted: #F4EFEB;
      --canvas-subtle: #EDE7DE;
      --ink: #201A16;
      --ink-muted: #665851;
      --ink-faint: #9E9189;
      --terracotta: #8B3A2B;
      --terracotta-hover: #712B1E;
      --terracotta-soft: #F9EBE8;
      --amber: #D97706;
      --amber-soft: #FEF3C7;
      --sage: #4A6B5B;
      --sage-soft: #EAF2ED;
      --border: #E5DFD5;
      --border-strong: #D5CCC0;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --shadow-sm: 0 2px 6px -1px rgba(36, 26, 22, 0.05);
      --shadow-md: 0 10px 24px -4px rgba(36, 26, 22, 0.08), 0 2px 6px -1px rgba(36, 26, 22, 0.04);
      --shadow-lg: 0 20px 36px -6px rgba(36, 26, 22, 0.12), 0 4px 12px -2px rgba(36, 26, 22, 0.05);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Top Navigation */
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(250, 247, 242, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
      color: var(--ink);
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(145deg, #8B3A2B, #A84936);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      box-shadow: 0 4px 10px rgba(139, 58, 43, 0.25);
    }
    .brand-mark svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    nav {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    nav a {
      color: var(--ink-muted);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    nav a:hover { color: var(--terracotta); }
    .nav-btn {
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      background-color: var(--terracotta);
      color: #FFFFFF !important;
      font-weight: 600;
      transition: background-color 0.15s ease, transform 0.15s ease;
      box-shadow: var(--shadow-sm);
    }
    .nav-btn:hover {
      background-color: var(--terracotta-hover);
      transform: translateY(-1px);
    }

    /* Hero Section */
    .hero {
      max-width: 1100px;
      margin: 0 auto;
      padding: 5rem 1.5rem 3.5rem;
      text-align: center;
    }
    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      background: var(--terracotta-soft);
      color: var(--terracotta);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1.75rem;
      border: 1px solid rgba(139, 58, 43, 0.2);
    }
    h1 {
      font-family: var(--font-serif);
      font-size: clamp(2.6rem, 5.5vw, 4.4rem);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 1.5rem;
      color: var(--ink);
    }
    h1 em {
      font-style: italic;
      color: var(--terracotta);
      font-weight: 500;
    }
    .hero-lead {
      font-size: clamp(1.1rem, 2vw, 1.3rem);
      color: var(--ink-muted);
      max-width: 720px;
      margin: 0 auto 2.5rem;
      font-weight: 400;
      line-height: 1.6;
    }
    .cta-cluster {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin-bottom: 3.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.9rem 1.85rem;
      border-radius: 9px;
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    }
    .btn-primary {
      background-color: var(--terracotta);
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(139, 58, 43, 0.28);
    }
    .btn-primary:hover {
      background-color: var(--terracotta-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 58, 43, 0.35);
    }
    .btn-secondary {
      background-color: var(--canvas-surface);
      color: var(--ink);
      border: 1px solid var(--border-strong);
      box-shadow: var(--shadow-sm);
    }
    .btn-secondary:hover {
      border-color: var(--terracotta);
      color: var(--terracotta);
      transform: translateY(-2px);
    }

    /* Social Proof Strip */
    .proof-strip {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 3.5rem;
      padding: 1.75rem 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .proof-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .proof-num {
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 700;
      color: var(--terracotta);
      line-height: 1.1;
    }
    .proof-label {
      font-size: 0.82rem;
      color: var(--ink-faint);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
    }

    /* Live Product Preview Frame (Flutter Code in HTML) */
    .showcase-section {
      max-width: 1160px;
      margin: 4.5rem auto 6rem;
      padding: 0 1.5rem;
    }
    .reader-stage {
      background: var(--canvas-surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1.25fr 1fr;
    }
    @media (max-width: 900px) {
      .reader-stage { grid-template-columns: 1fr; }
    }

    /* Left pane: The Reading Well */
    .reading-well {
      padding: 2.75rem 3rem 2.25rem;
      background-color: #FCFAF6;
      border-right: 1px solid var(--border);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .reader-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.25rem;
      margin-bottom: 1.75rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--ink-faint);
      font-weight: 500;
    }
    .book-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .book-meta strong {
      color: var(--ink);
      font-family: var(--font-serif);
      font-size: 1rem;
    }
    .reading-content {
      font-family: var(--font-serif);
      font-size: 1.18rem;
      line-height: 1.85;
      color: #2D2520;
    }
    .reading-content p {
      margin-bottom: 1.25rem;
      text-align: justify;
    }
    .chapter-heading {
      font-family: var(--font-serif);
      font-size: 1.6rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    /* Highlighted sentence with Bookies Theme Colors */
    .bookies-highlight {
      background: #FFE8DC;
      border-bottom: 2px solid var(--terracotta);
      padding: 2px 4px;
      border-radius: 3px;
      position: relative;
      cursor: pointer;
    }

    /* Passage Selection Context Menu (Converted from Flutter) */
    .context-menu-popover {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.6rem;
      border-radius: 9999px;
      background: var(--ink);
      color: #FFFFFF;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      position: absolute;
      top: 158px;
      left: 120px;
      z-index: 10;
      transform: translateY(-100%);
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 600;
    }
    .context-menu-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 9999px;
      background: transparent;
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }
    .context-menu-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .context-menu-btn.active {
      background: var(--terracotta);
      color: #FFFFFF;
    }

    /* Ambient Progress Bar (Converted from Flutter AmbientProgressBar) */
    .ambient-bar-container {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .ambient-bar-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--ink-faint);
      font-weight: 600;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .ambient-track {
      position: relative;
      height: 6px;
      background: #E8E0D5;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
    }
    .ambient-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 64%;
      background: var(--terracotta);
      border-radius: 9999px;
    }
    .participant-pin {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      color: #FFFFFF;
      cursor: pointer;
    }
    .pin-marcus { left: 34%; background: #2563EB; }
    .pin-elena { left: 52%; background: #D97706; }
    .pin-you { left: 64%; background: var(--terracotta); outline: 2px solid var(--terracotta); outline-offset: 1px; }
    .pin-priya { left: 88%; background: #059669; }

    /* Right pane: Marginalia & Community Thread (Converted from Flutter MarginaliaCard) */
    .marginalia-panel {
      padding: 2.5rem;
      background: var(--canvas-surface);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .thread-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    .thread-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.25;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: #ECFDF5;
      color: #047857;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Selected passage quote block */
    .quote-anchor {
      padding: 0.9rem 1.15rem;
      background: var(--canvas-muted);
      border-left: 3px solid var(--terracotta);
      border-radius: 0 8px 8px 0;
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 0.95rem;
      color: var(--ink);
      margin-bottom: 1.5rem;
      line-height: 1.55;
    }

    /* Comment list */
    .comments-stream {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex: 1;
    }
    .comment-card {
      display: flex;
      gap: 0.85rem;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #FFFFFF;
      flex-shrink: 0;
    }
    .av-elena { background: #D97706; }
    .av-marcus { background: #2563EB; }
    .av-priya { background: #059669; }
    .comment-body {
      background: var(--canvas-muted);
      padding: 0.85rem 1.1rem;
      border-radius: 12px;
      font-size: 0.9rem;
      flex: 1;
      border: 1px solid var(--border);
    }
    .comment-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.35rem;
      font-size: 0.78rem;
    }
    .comment-author {
      font-weight: 700;
      color: var(--ink);
    }
    .comment-time {
      color: var(--ink-faint);
    }
    .comment-text {
      color: #382F2A;
      line-height: 1.5;
    }

    /* Reactions strip */
    .reactions-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.6rem;
    }
    .reaction-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      background: var(--canvas-surface);
      border: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--ink-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .reaction-pill:hover {
      border-color: var(--terracotta);
      color: var(--terracotta);
    }

    /* Input area */
    .reply-box {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .reply-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 9px;
      border: 1px solid var(--border-strong);
      background: var(--canvas-muted);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: var(--ink);
      outline: none;
    }
    .reply-input:focus {
      border-color: var(--terracotta);
      background: #FFFFFF;
    }
    .reply-btn {
      padding: 0.75rem 1.25rem;
      border-radius: 9px;
      background: var(--terracotta);
      color: #FFFFFF;
      border: none;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }

    /* Editorial Pillars Section */
    .section-title {
      text-align: center;
      max-width: 720px;
      margin: 0 auto 3.5rem;
    }
    .section-tag {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--terracotta);
      margin-bottom: 0.75rem;
    }
    .section-title h2 {
      font-family: var(--font-serif);
      font-size: clamp(2rem, 3.8vw, 3rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: var(--ink);
      margin-bottom: 1rem;
    }
    .section-title p {
      font-size: 1.1rem;
      color: var(--ink-muted);
      line-height: 1.6;
    }

    .pillars-grid {
      max-width: 1160px;
      margin: 0 auto 6rem;
      padding: 0 1.5rem;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2.25rem;
    }
    @media (max-width: 820px) {
      .pillars-grid { grid-template-columns: 1fr; }
    }
    .pillar-card {
      background: var(--canvas-surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .pillar-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: var(--border-strong);
    }
    .pillar-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
      background: var(--terracotta);
    }
    .pillar-num {
      font-family: var(--font-serif);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--terracotta);
      margin-bottom: 0.75rem;
    }
    .pillar-heading {
      font-family: var(--font-serif);
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: var(--ink);
    }
    .pillar-desc {
      color: var(--ink-muted);
      font-size: 0.98rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .pillar-micro-ui {
      background: var(--canvas-muted);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
      font-size: 0.88rem;
    }

    /* Spoiler Shielding Preview */
    .spoiler-curtain {
      background: linear-gradient(180deg, #F9F5EE 0%, #ECE4D6 100%);
      border: 1px dashed var(--border-strong);
      border-radius: 10px;
      padding: 1.25rem;
      text-align: center;
      color: var(--ink-muted);
    }
    .spoiler-curtain strong {
      display: block;
      color: var(--ink);
      font-family: var(--font-serif);
      font-size: 1.05rem;
      margin-bottom: 0.35rem;
    }

    /* Active Book Clubs Strip */
    .clubs-section {
      background: var(--canvas-muted);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 5rem 1.5rem;
    }
    .clubs-container {
      max-width: 1160px;
      margin: 0 auto;
    }
    .clubs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.75rem;
      margin-top: 3rem;
    }
    .club-card {
      background: var(--canvas-surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.75rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .club-badge {
      display: inline-block;
      align-self: flex-start;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: var(--sage-soft);
      color: var(--sage);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .club-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 0.35rem;
    }
    .club-book {
      font-size: 0.92rem;
      color: var(--terracotta);
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .club-target {
      font-size: 0.85rem;
      color: var(--ink-muted);
      padding: 0.65rem 0.85rem;
      background: var(--canvas);
      border-radius: 8px;
      margin-bottom: 1.25rem;
      border: 1px solid var(--border);
    }
    .club-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      color: var(--ink-faint);
      font-weight: 500;
    }

    /* FAQ Section */
    .faq-section {
      max-width: 860px;
      margin: 5rem auto;
      padding: 0 1.5rem;
    }
    .faq-item {
      border-bottom: 1px solid var(--border);
      padding: 1.75rem 0;
    }
    .faq-question {
      font-family: var(--font-serif);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 0.65rem;
    }
    .faq-answer {
      color: var(--ink-muted);
      font-size: 0.98rem;
      line-height: 1.65;
    }

    /* Final CTA Card */
    .final-cta {
      max-width: 1040px;
      margin: 0 auto 6rem;
      padding: 4rem 2rem;
      background: linear-gradient(145deg, #201A16 0%, #382A22 100%);
      color: #FFFFFF;
      border-radius: 20px;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .final-cta h2 {
      font-family: var(--font-serif);
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .final-cta p {
      color: #DDD4CE;
      max-width: 620px;
      margin: 0 auto 2.5rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    /* Footer */
    footer {
      background: var(--canvas-muted);
      border-top: 1px solid var(--border);
      padding: 3.5rem 1.5rem 2.5rem;
    }
    .footer-inner {
      max-width: 1160px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .footer-col-brand {
      max-width: 320px;
    }
    .footer-brand {
      font-family: var(--font-serif);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 0.5rem;
    }
    .footer-tagline {
      font-size: 0.88rem;
      color: var(--ink-muted);
      line-height: 1.5;
    }
    .footer-links {
      display: flex;
      gap: 3rem;
      flex-wrap: wrap;
    }
    .footer-link-group h4 {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink);
      margin-bottom: 1rem;
    }
    .footer-link-group a {
      display: block;
      color: var(--ink-muted);
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 0.65rem;
      transition: color 0.15s;
    }
    .footer-link-group a:hover { color: var(--terracotta); }
    .footer-bottom {
      max-width: 1160px;
      margin: 2.5rem auto 0;
      padding-top: 1.75rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--ink-faint);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer-bottom a {
      color: var(--ink-muted);
      text-decoration: none;
    }
    .footer-bottom a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="header-inner">
      <a href="/home" class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
        </div>
        <div class="brand-name">Bookies</div>
      </a>
      <nav>
        <a href="#reader">The Reader</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#clubs">Clubs</a>
        <a href="/privacy">Privacy</a>
        <a href="#download" class="nav-btn">Get App</a>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <main>
    <section class="hero">
      <div class="pill-badge">An Independent Reading Sanctuary</div>
      <h1>Where every margin holds a <em>conversation</em>.</h1>
      <p class="hero-lead">
        Bookies brings readers together. Synchronized reading timelines, in-margin passage discussions, and ambient co-presence — bringing the warmth of shared physical reading to your digital library.
      </p>

      <div class="cta-cluster">
        <a href="#download" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download for Mobile
        </a>
        <a href="#reader" class="btn btn-secondary">
          Explore the Reader &darr;
        </a>
      </div>

      <div class="proof-strip">
        <div class="proof-item">
          <div class="proof-num">3,400+</div>
          <div class="proof-label">Active Reading Circles</div>
        </div>
        <div class="proof-item">
          <div class="proof-num">85,000+</div>
          <div class="proof-label">Margin Annotations Shared</div>
        </div>
        <div class="proof-item">
          <div class="proof-num">100%</div>
          <div class="proof-label">Free of Ad Trackers & Noise</div>
        </div>
      </div>
    </section>

    <!-- Product Showcase: The Live Reader & Margin Discussion (Converted from Flutter Code) -->
    <section id="reader" class="showcase-section">
      <div class="reader-stage">
        <!-- Left: The Reading Well -->
        <div class="reading-well">
          <div>
            <div class="reader-header">
              <div class="book-meta">
                <span>Reading:</span>
                <strong>Dune</strong>
                <span>&bull; Frank Herbert</span>
              </div>
              <div>Page 84 of 412</div>
            </div>

            <div class="chapter-heading">Chapter IV &mdash; The Litany Against Fear</div>

            <div class="reading-content">
              <p>
                The room grew quiet as the gom jabbar remained steady at his neck. Paul remembered the old proverb from the Orange Catholic Bible, whispered in the deep stone halls of Castle Caladan.
              </p>

              <!-- Converted Flutter PassageSelectionContextMenu & PassageSelectionHighlight -->
              <p style="position: relative;">
                <span class="context-menu-popover">
                  <button class="context-menu-btn active">&bull; 💬 Discuss (8)</button>
                  <button class="context-menu-btn">&bull; &starf; Rate 4.9</button>
                  <button class="context-menu-btn">&bull; 🔖 Quote Card</button>
                  <button class="context-menu-btn">&bull; 🖍 Highlight</button>
                </span>
                <mark class="bookies-highlight">&ldquo;I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear. I will permit it to pass over me and through me.&rdquo;</mark>
              </p>

              <p>
                And when it has gone past I will turn the inner eye to see its path. Where the fear has gone there will be nothing. Only I will remain.
              </p>
            </div>
          </div>

          <!-- Converted Flutter AmbientProgressBar -->
          <div class="ambient-bar-container">
            <div class="ambient-bar-label">
              <span>Chapter IV Progression</span>
              <span>4 Club Members Active</span>
            </div>
            <div class="ambient-track">
              <div class="ambient-fill"></div>
              <div class="participant-pin pin-marcus" title="Marcus Cole (Pg 72)">M</div>
              <div class="participant-pin pin-elena" title="Elena Vance (Pg 78)">E</div>
              <div class="participant-pin pin-you" title="You (Pg 84 &bull; 64%)">You</div>
              <div class="participant-pin pin-priya" title="Priya Patel (Pg 92)">P</div>
            </div>
          </div>
        </div>

        <!-- Right: The Marginalia Panel (Converted from Flutter MarginaliaCard) -->
        <div class="marginalia-panel">
          <div>
            <div class="thread-header">
              <div>
                <div class="badge-live"><span class="live-dot"></span> Live Reading Session</div>
                <h3 class="thread-title" style="margin-top: 0.5rem;">The Litany as Psychological Anchor</h3>
              </div>
            </div>

            <div class="quote-anchor">
              &ldquo;I must not fear. Fear is the mind-killer...&rdquo;
            </div>

            <div class="comments-stream">
              <div class="comment-card">
                <div class="avatar av-elena">E</div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-author">Elena Vance</span>
                    <span class="comment-time">12m ago</span>
                  </div>
                  <div class="comment-text">
                    Notice how Herbert treats fear as an external weather pattern rather than an internal flaw &mdash; you allow it to flow through rather than resisting it.
                  </div>
                  <div class="reactions-bar">
                    <span class="reaction-pill">&bull; &bull; &bull; 🔥 8</span>
                    <span class="reaction-pill">&bull; 💡 14</span>
                  </div>
                </div>
              </div>

              <div class="comment-card">
                <div class="avatar av-marcus">M</div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-author">Marcus Cole</span>
                    <span class="comment-time">4m ago</span>
                  </div>
                  <div class="comment-text">
                    Completely agreed. It echoes the Zen mindfulness teachings Paul learned during his early prana-bindu training on Caladan.
                  </div>
                  <div class="reactions-bar">
                    <span class="reaction-pill">&bull; ❤️ 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="reply-box">
            <input type="text" class="reply-input" placeholder="Add a thought to this passage..." readonly value="It foreshadows the trial in the deep desert...">
            <button class="reply-btn">Reply</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Editorial Pillars (Informative Product Architecture) -->
    <section id="how-it-works">
      <div class="section-title">
        <div class="section-tag">Thoughtful Architecture</div>
        <h2>Designed for deep readers, not doom-scrollers.</h2>
        <p>Bookies rejects noisy feeds and surface-level ratings. Every interaction is anchored to the intimacy of the text.</p>
      </div>

      <div class="pillars-grid">
        <div class="pillar-card">
          <div>
            <div class="pillar-num">01</div>
            <h3 class="pillar-heading">Margin Notes, Not Chat Rooms</h3>
            <p class="pillar-desc">
              Conversations don't get lost in chaotic messaging threads. In Bookies, every debate, annotation, and observation is pinned to the exact sentence or paragraph in the EPUB.
            </p>
          </div>
          <div class="pillar-micro-ui">
            <strong>Sentence-Level CFI Precision:</strong> Tap any passage to start a dedicated thread that stays with the text across devices.
          </div>
        </div>

        <div class="pillar-card">
          <div>
            <div class="pillar-num">02</div>
            <h3 class="pillar-heading">Ambient Synchronous Co-Presence</h3>
            <p class="pillar-desc">
              Reading has historically been solitary. Bookies brings the cozy feeling of sitting in the same library room with friends. See ambient progress markers as your club reads in real time.
            </p>
          </div>
          <div class="pillar-micro-ui">
            <strong>Live Progress Scrubber:</strong> Glance at the bottom ambient bar to see who is reading along with you right now.
          </div>
        </div>

        <div class="pillar-card">
          <div>
            <div class="pillar-num">03</div>
            <h3 class="pillar-heading">Automatic Spoiler Shielding</h3>
            <p class="pillar-desc">
              Read at your own pace without dreading what’s ahead. Bookies locks margin notes and club discussion threads behind progressive chapter curtains until you reach that milestone in the text.
            </p>
          </div>
          <div class="spoiler-curtain">
            <strong>🔒 Chapter 16 Spoilers Hidden</strong>
            <span>Progress through Chapter 16 to unlock member discussion notes.</span>
          </div>
        </div>

        <div class="pillar-card">
          <div>
            <div class="pillar-num">04</div>
            <h3 class="pillar-heading">Typographic Quote Cards</h3>
            <p class="pillar-desc">
              Turn poignant lines into editorial-grade quote cards formatted with classic bookbinding borders, serif typography, and chapter citations. Perfect for your notebook or sharing with literary circles.
            </p>
          </div>
          <div class="pillar-micro-ui" style="border-left: 3px solid var(--terracotta); font-family: var(--font-serif); font-style: italic;">
            &ldquo;A beginning is the time for taking the most delicate care that the balances are correct.&rdquo;
            <div style="font-style: normal; font-family: var(--font-sans); font-size: 0.75rem; color: var(--ink-faint); margin-top: 0.4rem;">
              Princess Irulan &bull; Dune &bull; Impact Rating 4.9/5
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Reading Clubs Section -->
    <section id="clubs" class="clubs-section">
      <div class="clubs-container">
        <div class="section-title" style="margin-bottom: 2rem;">
          <div class="section-tag">Community Life</div>
          <h2>Find your people around a book.</h2>
          <p>Join an existing circle or gather your closest friends to embark on a story together.</p>
        </div>

        <div class="clubs-grid">
          <div class="club-card">
            <div>
              <span class="club-badge">Sci-Fi & Speculative</span>
              <h3 class="club-title">The Deep Sci-Fi Collective</h3>
              <div class="club-book">Currently Reading: Dune</div>
              <div class="club-target">
                <strong>Weekly Cadence:</strong> Chapters 12&ndash;16 by Sunday 8:00 PM
              </div>
            </div>
            <div class="club-footer">
              <span>24 Active Readers</span>
              <span>&bull; 6 Reading Now</span>
            </div>
          </div>

          <div class="club-card">
            <div>
              <span class="club-badge">Modern Fiction</span>
              <h3 class="club-title">The Literary Salon</h3>
              <div class="club-book">Currently Reading: Tomorrow, and Tomorrow, and Tomorrow</div>
              <div class="club-target">
                <strong>Weekly Cadence:</strong> Act II Discussion &bull; Ch. 6&ndash;9
              </div>
            </div>
            <div class="club-footer">
              <span>38 Active Readers</span>
              <span>&bull; 9 Reading Now</span>
            </div>
          </div>

          <div class="club-card">
            <div>
              <span class="club-badge">Classic Literature</span>
              <h3 class="club-title">Gothic Romance Fellowship</h3>
              <div class="club-book">Currently Reading: Frankenstein</div>
              <div class="club-target">
                <strong>Weekly Cadence:</strong> Letters 1&ndash;4 & Chapters 1&ndash;5
              </div>
            </div>
            <div class="club-footer">
              <span>19 Active Readers</span>
              <span>&bull; 4 Reading Now</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <div class="section-title" style="margin-bottom: 2.5rem;">
        <div class="section-tag">Frequently Asked Questions</div>
        <h2>Everything you need to know.</h2>
      </div>

      <div class="faq-item">
        <div class="faq-question">Can I import my own EPUB books into Bookies?</div>
        <div class="faq-answer">
          Yes! Bookies is an open EPUB reader. You can import any DRM-free .epub file from your device or cloud storage. Bookies indexes canonical EPUB CFI locations to ensure that all margin notes and highlights line up perfectly across every screen size.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">How do Book Clubs and reading paces work?</div>
        <div class="faq-answer">
          Anyone can create a public or private book club in seconds. Set a weekly reading target (e.g., 3 chapters per week), invite your friends via a private invite link, and enjoy in-margin notes and synchronous reading sessions. Notes for future chapters remain shielded until you catch up.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">Is Bookies free to use?</div>
        <div class="faq-answer">
          Yes. The core e-reader, personal bookshelf, margin annotation tools, and private book clubs are completely free. We do not sell user data or show advertisements.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">How does authentication work?</div>
        <div class="faq-answer">
          You can securely sign in using Google Sign-In or your personal email address. We request only basic identity scopes (name and email) to provision your reader profile.
        </div>
      </div>
    </section>

    <!-- Final Call to Action -->
    <section id="download" style="padding: 0 1.5rem;">
      <div class="final-cta">
        <h2>Your reading nook awaits.</h2>
        <p>
          Gather your reading circle, crack open a fresh story, and discover the joy of reading together in the margins.
        </p>
        <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
          <a href="#" class="btn btn-primary" style="background: #FFFFFF; color: var(--terracotta);">
            Download for Android
          </a>
          <a href="#" class="btn btn-secondary" style="background: transparent; color: #FFFFFF; border-color: rgba(255, 255, 255, 0.4);">
            Download for iOS
          </a>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer>
    <div class="footer-inner">
      <div class="footer-col-brand">
        <div class="footer-brand">Bookies</div>
        <p class="footer-tagline">
          An independent social e-reader and reading club platform designed for slow readers, thoughtful annotators, and warm literary communities.
        </p>
      </div>

      <div class="footer-links">
        <div class="footer-link-group">
          <h4>Explore</h4>
          <a href="#reader">The Reader</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#clubs">Book Clubs</a>
          <a href="#download">Get App</a>
        </div>

        <div class="footer-link-group">
          <h4>Legal & Trust</h4>
          <a href="/privacy">Privacy Policy</a>
          <a href="mailto:bookies.support@gmail.com">Contact Support</a>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div>&copy; ${new Date().getFullYear()} Bookies. All rights reserved.</div>
      <div>Support: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a></div>
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
  <title>Privacy Policy &mdash; Bookies</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canvas: #FAF7F2;
      --canvas-surface: #FFFFFF;
      --canvas-muted: #F4EFEB;
      --ink: #201A16;
      --ink-muted: #665851;
      --ink-faint: #9E9189;
      --terracotta: #8B3A2B;
      --border: #E5DFD5;
      --border-strong: #D5CCC0;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(250, 247, 242, 0.95);
      backdrop-filter: blur(8px);
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--ink);
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: var(--terracotta);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-serif);
      font-weight: 700;
      color: white;
    }
    .brand-name {
      font-family: var(--font-serif);
      font-size: 1.45rem;
      font-weight: 700;
    }
    nav a {
      color: var(--ink-muted);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.15s;
    }
    nav a:hover { color: var(--terracotta); }
    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      flex: 1;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .last-updated {
      color: var(--terracotta);
      font-size: 0.92rem;
      margin-bottom: 2.5rem;
      font-weight: 600;
    }
    .card {
      background-color: var(--canvas-surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.75rem;
      box-shadow: 0 4px 14px rgba(36, 26, 22, 0.04);
    }
    h2 {
      font-family: var(--font-serif);
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: var(--ink);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.4rem;
    }
    h2:first-of-type { margin-top: 0; }
    p, ul {
      color: var(--ink-muted);
      margin-bottom: 1.15rem;
      font-size: 1rem;
    }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    strong { color: var(--ink); }
    a { color: var(--terracotta); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer {
      border-top: 1px solid var(--border);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--ink-faint);
      font-size: 0.9rem;
      background: var(--canvas-muted);
    }
    footer a { color: var(--ink-muted); }
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
    </nav>
  </header>

  <div class="container">
    <h1>Privacy Policy</h1>
    <div class="last-updated">Effective Date: October 30, 2026</div>

    <div class="card">
      <h2>1. Introduction</h2>
      <p>
        Welcome to <strong>Bookies</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner. This Privacy Policy details our practices concerning data collection, usage, and protection when you use the Bookies mobile applications and associated cloud backend services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We collect only the information strictly necessary to provide you with social reading and synchronized book club features:</p>
      <ul>
        <li><strong>Google OAuth Account Information:</strong> When you choose to authenticate via Google Sign-In, we receive your verified email address, display name, and avatar picture URL. We use this strictly to provision and display your reader profile.</li>
        <li><strong>Reading Progress & Annotations:</strong> We store your reading locations (EPUB CFI locators), reading progression percentages, margin comments, passage discussions, and live reading co-presence indicators.</li>
        <li><strong>Community & Club Memberships:</strong> Information about the book clubs and discussion groups you create or join.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>Your data is used strictly to power core app functionality:</p>
      <ul>
        <li>Authenticating your session securely across devices.</li>
        <li>Synchronizing your reading position with your book clubs.</li>
        <li>Delivering real-time co-presence and live passage reactions to fellow club members.</li>
        <li>We <strong>NEVER</strong> sell, rent, monetize, or share your personal information with third-party advertising brokers or tracking networks.</li>
      </ul>

      <h2>4. Data Storage, Security & Encryption</h2>
      <p>
        All communications between your device and our servers are encrypted using Transport Layer Security (HTTPS/TLS). Sensitive access tokens are stored securely in hardware-backed platform keystores (Android Keystore / iOS Keychain). Backend database connections are strictly authenticated and encrypted.
      </p>

      <h2>5. Google User Data Policy Compliance</h2>
      <p>
        Bookies&rsquo; use and transfer to any other app of information received from Google APIs adheres to the 
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements. We request only the minimum necessary Google scopes (<code>email</code>, <code>profile</code>, <code>openid</code>).
      </p>

      <h2>6. Your Rights & Account Deletion</h2>
      <p>
        You retain full control over your personal data. You may request the export or complete deletion of your account, annotations, and reading history at any time by contacting our support team or initiating deletion from within the app settings.
      </p>

      <h2>7. Contact Information</h2>
      <p>
        If you have any questions or concerns regarding this Privacy Policy or our security practices, please contact us at:<br>
        <strong>Email:</strong> <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a>
      </p>
    </div>
  </div>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Bookies. All rights reserved. &bull; <a href="/home">Home</a> &bull; Support: <a href="mailto:bookies.support@gmail.com">bookies.support@gmail.com</a></p>
  </footer>
</body>
</html>`;
  }
}
