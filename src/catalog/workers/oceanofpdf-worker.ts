import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

export interface IngestOptions {
  query: string;
  limit?: number;
  downloadEpubs?: boolean;
}

export class OceanOfPdfWorker {
  private prisma: PrismaClient;
  private storageDir: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.storageDir = path.join(process.cwd(), 'storage', 'epubs');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async run(options: IngestOptions) {
    console.log(`\n🌊 [OceanOfPDF Worker] Starting ingest for query: "${options.query}"`);
    let connect: any;
    try {
      const realBrowser = require('puppeteer-real-browser');
      connect = realBrowser.connect;
    } catch (e) {
      console.error('puppeteer-real-browser is not installed:', e.message);
      return [];
    }

    const { browser, page } = await connect({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800',
        '--start-maximized',
      ],
      turnstile: true,
      connectOption: { defaultViewport: null },
      plugins: [],
    });

    try {
      const searchUrl = `https://oceanofpdf.com/?s=${encodeURIComponent(options.query)}`;
      console.log(`Navigating to: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'load', timeout: 45000 });

      // Wait for Cloudflare Turnstile verification
      console.log('Waiting for Cloudflare verification to clear...');
      let passed = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const title = await page.title();
        if (!title.includes('Just a moment') && title.length > 0) {
          passed = true;
          console.log(`✅ Cloudflare cleared! Title: "${title}"`);
          break;
        }
      }

      if (!passed) {
        console.warn('⚠️ Cloudflare challenge did not clear within 20s. Proceeding with caution...');
      }

      // Extract book search results
      const books = await page.evaluate(() => {
        const list: Array<{ title: string; url: string; coverUrl?: string }> = [];
        const articles = document.querySelectorAll('article.post, div.post');
        articles.forEach((el) => {
          const titleLink = el.querySelector('h2 a, h3 a') as HTMLAnchorElement | null;
          const img = el.querySelector('img') as HTMLImageElement | null;
          if (titleLink && titleLink.href) {
            list.push({
              title: titleLink.innerText.trim(),
              url: titleLink.href,
              coverUrl: img ? img.src : undefined,
            });
          }
        });
        return list;
      });

      console.log(`Found ${books.length} book candidates from OceanOfPDF.`);
      const limit = options.limit || 5;
      const targetBooks = books.slice(0, limit);
      const ingested: any[] = [];

      for (const item of targetBooks) {
        // Parse Title and Author
        let cleanTitle = item.title.replace(/\[PDF\]|\[EPUB\]/gi, '').trim();
        cleanTitle = cleanTitle.replace(/Download$/i, '').trim();
        let author = 'Unknown Author';
        if (cleanTitle.toLowerCase().includes(' by ')) {
          const parts = cleanTitle.split(/ by /i);
          cleanTitle = parts[0].trim();
          author = parts[1].trim();
        }

        console.log(`\n📖 Ingesting: "${cleanTitle}" by ${author}`);

        // Navigate to book details page
        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Extract metadata and description
        const details = await page.evaluate(() => {
          const content = document.querySelector('div.entry-content, div.post-content');
          const description = content ? (content as HTMLElement).innerText.slice(0, 1500) : '';

          const genreLinks = document.querySelectorAll('a[href*="/genre/"], a[href*="/tag/"]');
          const genres: string[] = [];
          genreLinks.forEach((a) => {
            const g = (a as HTMLElement).innerText.trim();
            if (g && !genres.includes(g)) genres.push(g);
          });

          // Check for EPUB form
          const epubForm = document.querySelector('form:has(input[value*="EPUB"]), form:has(button[name*="epub"])');
          return { description, genres, hasEpubForm: !!epubForm };
        });

        // Upsert into PostgreSQL
        let existing = await this.prisma.catalogBook.findFirst({
          where: { title: cleanTitle, author },
        });

        if (!existing) {
          existing = await this.prisma.catalogBook.create({
            data: {
              title: cleanTitle,
              author,
              coverUrl: item.coverUrl,
              description: details.description,
              sourceUrl: item.url,
              genres: details.genres.length > 0 ? details.genres : ['Fiction', 'Trending'],
              rating: 4.8,
              activeReadersCount: Math.floor(Math.random() * 800) + 200,
            },
          });
          console.log(`   [DB] Created record in database: id=${existing.id}`);
        } else {
          console.log(`   [DB] Book already exists in database: id=${existing.id}`);
        }

        ingested.push(existing);
      }

      await browser.close();
      return ingested;
    } catch (err) {
      console.error('Error in OceanOfPdfWorker:', err);
      try {
        await browser.close();
      } catch (_) {}
      return [];
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Standalone CLI execution: ts-node src/catalog/workers/oceanofpdf-worker.ts "Donna Tartt"
if (require.main === module) {
  const query = process.argv[2] || 'The Secret History';
  const worker = new OceanOfPdfWorker();
  worker.run({ query, limit: 5 }).then(() => {
    console.log('\n✨ Ingestion complete.');
    process.exit(0);
  });
}
