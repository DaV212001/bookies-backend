import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

export interface ScrapedBookItem {
  title: string;
  author: string;
  coverUrl?: string;
  sourceUrl: string;
  genres: string[];
  description?: string;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly baseUrl = process.env.OCEANOFPDF_BASE_URL || 'https://oceanofpdf.com';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve featured / trending contemporary books from PostgreSQL cache
   */
  async getFeaturedBooks(limit: number = 20, baseUrl?: string): Promise<any[]> {
    const books = await this.prisma.catalogBook.findMany({
      orderBy: { activeReadersCount: 'desc' },
      take: limit,
    });
    return books.map((b) => this.enrichDownloadUrl(b, baseUrl));
  }

  /**
   * Search OceanOfPDF in real-time or retrieve from PostgreSQL database cache
   */
  async searchBooks(query: string, baseUrl?: string): Promise<any[]> {
    const q = query.trim().toLowerCase();

    // 1. Check local database cache first
    const cached = await this.prisma.catalogBook.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    if (cached.length >= 5) {
      return cached.map((b) => this.enrichDownloadUrl(b, baseUrl));
    }

    // 2. Try OceanOfPDF scraping; if blocked by Cloudflare (403), gracefully fall back to OpenLibrary
    try {
      const scraped = await this.scrapeSearchPage(q);
      if (scraped.length > 0) {
        const books = await this.saveAndReturnBooks(scraped);
        return books.map((b) => this.enrichDownloadUrl(b, baseUrl));
      }
    } catch (err) {
      this.logger.warn(`OceanOfPDF direct scrape unavailable (${err.message}). Falling back to OpenLibrary catalog...`);
    }

    // 3. Fallback to OpenLibrary high-speed book search API
    try {
      const openLibraryBooks = await this.searchOpenLibrary(q);
      if (openLibraryBooks.length > 0) {
        const books = await this.saveAndReturnBooks(openLibraryBooks);
        return books.map((b) => this.enrichDownloadUrl(b, baseUrl));
      }
    } catch (openLibErr) {
      this.logger.error(`OpenLibrary search failed: ${openLibErr.message}`);
    }

    return cached.map((b) => this.enrichDownloadUrl(b, baseUrl));
  }

  /**
   * Ensure downloadUrl is always populated and reachable
   */
  enrichDownloadUrl(book: any, baseUrl?: string): any {
    if (!book) return book;
    const base = baseUrl || 'http://localhost:3000/api/v1';

    // If book already has an external downloadUrl (not this server's endpoint), preserve it
    if (
      book.downloadUrl &&
      book.downloadUrl.startsWith('http') &&
      !book.downloadUrl.includes('/catalog/')
    ) {
      return book;
    }

    return {
      ...book,
      downloadUrl: `${base}/catalog/${book.id}/download`,
    };
  }

  private async saveAndReturnBooks(items: ScrapedBookItem[]): Promise<any[]> {
    const results: any[] = [];
    for (const item of items) {
      let existing = await this.prisma.catalogBook.findFirst({
        where: { title: item.title, author: item.author },
      });

      if (!existing) {
        existing = await this.prisma.catalogBook.create({
          data: {
            title: item.title,
            author: item.author,
            coverUrl: item.coverUrl,
            description: item.description,
            sourceUrl: item.sourceUrl,
            downloadUrl: (item as any).downloadUrl,
            genres: item.genres,
            rating: (item as any).rating,
          },
        });
      }
      results.push(existing);
    }
    return results;
  }

  /**
   * High-speed OpenLibrary catalog search fallback
   */
  async searchOpenLibrary(query: string): Promise<ScrapedBookItem[]> {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`;
    this.logger.log(`Querying OpenLibrary: ${url}`);

    const res = await axios.get(url, { timeout: 8000 });
    const docs = res.data?.docs || [];

    return docs.map((doc: any) => {
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined;

      const genres: string[] = Array.isArray(doc.subject)
        ? doc.subject.slice(0, 3)
        : [];

      return {
        title: doc.title || 'Untitled',
        author: Array.isArray(doc.author_name)
          ? doc.author_name.join(', ')
          : 'Unknown Author',
        coverUrl,
        sourceUrl: `https://openlibrary.org${doc.key}`,
        description: doc.first_sentence ? doc.first_sentence[0] : undefined,
        genres,
        rating: doc.ratings_average ? parseFloat(doc.ratings_average.toFixed(1)) : 4.5,
      };
    });
  }

  /**
   * Scrape search result page from OceanOfPDF
   */
  async scrapeSearchPage(query: string): Promise<ScrapedBookItem[]> {
    const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
    this.logger.log(`Scraping OceanOfPDF search: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const books: ScrapedBookItem[] = [];

    $('article.post, div.post').each((_, elem) => {
      const titleLink = $(elem).find('h2 a, h3 a').first();
      const rawTitle = titleLink.text().trim();
      const sourceUrl = titleLink.attr('href') || '';
      const coverUrl = $(elem).find('img').first().attr('src') || '';

      if (rawTitle && sourceUrl) {
        // Parse Title and Author (Often formatted as "[PDF] [EPUB] Title by Author Download")
        let cleanTitle = rawTitle.replace(/\[PDF\]|\[EPUB\]/gi, '').trim();
        cleanTitle = cleanTitle.replace(/Download$/i, '').trim();

        let author = 'Unknown Author';
        if (cleanTitle.toLowerCase().includes(' by ')) {
          const parts = cleanTitle.split(/ by /i);
          cleanTitle = parts[0].trim();
          author = parts[1].trim();
        }

        books.push({
          title: cleanTitle,
          author: author,
          coverUrl: coverUrl,
          sourceUrl: sourceUrl,
          genres: [],
        });
      }
    });

    return books;
  }

  /**
   * Scrape single book details & extract EPUB download form / link
   */
  async getBookDetails(catalogBookId: string): Promise<any> {
    const book = await this.prisma.catalogBook.findUnique({
      where: { id: catalogBookId },
    });

    if (!book) {
      throw new HttpException('Catalog book not found', HttpStatus.NOT_FOUND);
    }

    if (!book.sourceUrl) {
      return book;
    }

    try {
      const response = await axios.get(book.sourceUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const description = $('div.entry-content, div.post-content').text().trim();
      const genres: string[] = [];

      $('a[href*="/genre/"], a[href*="/tag/"]').each((_, el) => {
        const g = $(el).text().trim();
        if (g && !genres.includes(g)) genres.push(g);
      });

      const updated = await this.prisma.catalogBook.update({
        where: { id: catalogBookId },
        data: {
          description: description.substring(0, 2000),
          genres: genres,
        },
      });

      return updated;
    } catch (e) {
      return book;
    }
  }

  /**
   * Resolve and proxy/stream the EPUB file to the client
   */
  async getEpubStream(catalogBookId: string): Promise<{ stream: any; filename: string }> {
    const book = await this.prisma.catalogBook.findUnique({
      where: { id: catalogBookId },
    });

    if (!book) {
      throw new HttpException('Catalog book not found', HttpStatus.NOT_FOUND);
    }

    const filename = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.epub`;

    // 1. Check local storage folder for pre-ingested or cached EPUB
    const localPath = path.join(process.cwd(), 'storage', 'epubs', `${catalogBookId}.epub`);
    if (fs.existsSync(localPath)) {
      this.logger.log(`Serving EPUB from local disk cache: ${localPath}`);
      return { stream: fs.createReadStream(localPath), filename };
    }

    // 2. Check direct downloadUrl if available (strictly avoiding recursive self-fetch)
    const isSelfUrl =
      !book.downloadUrl ||
      book.downloadUrl.includes(`/catalog/${catalogBookId}/download`) ||
      book.downloadUrl.includes('/api/v1/catalog') ||
      book.downloadUrl.includes('localhost:3000') ||
      book.downloadUrl.includes('127.0.0.1');

    if (book.downloadUrl && !isSelfUrl) {
      try {
        const streamResp = await axios.get(book.downloadUrl, {
          responseType: 'stream',
          timeout: 15000,
        });
        return { stream: streamResp.data, filename };
      } catch (err) {
        this.logger.warn(`Failed to stream from downloadUrl: ${err.message}`);
      }
    }

    // 3. Fallback to default sample EPUB if sourceUrl not scrapeable
    const defaultPath = path.join(process.cwd(), 'storage', 'epubs', 'default.epub');
    if (fs.existsSync(defaultPath)) {
      this.logger.log(`Serving default fallback EPUB for: ${book.title}`);
      return { stream: fs.createReadStream(defaultPath), filename };
    }

    throw new HttpException('EPUB file not found on disk or network', HttpStatus.NOT_FOUND);
  }
}
