import { Controller, Get, Param, Query, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  private getBaseUrl(req: Request): string {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}/api/v1`;
  }

  @Get('featured')
  async getFeatured(@Req() req: Request, @Query('limit') limit?: number) {
    const baseUrl = this.getBaseUrl(req);
    return this.catalogService.getFeaturedBooks(limit ? Number(limit) : 20, baseUrl);
  }

  @Get('search')
  async search(
    @Req() req: Request,
    @Query('q') query?: string,
    @Query('limit') limit?: number,
  ) {
    const baseUrl = this.getBaseUrl(req);
    if (!query || query.trim().length === 0) {
      return this.catalogService.getFeaturedBooks(limit ? Number(limit) : 20, baseUrl);
    }
    return this.catalogService.searchBooks(query, baseUrl);
  }

  @Get(':id')
  async getDetails(@Req() req: Request, @Param('id') id: string) {
    const baseUrl = this.getBaseUrl(req);
    const book = await this.catalogService.getBookDetails(id);
    return this.catalogService.enrichDownloadUrl(book, baseUrl);
  }

  @Get(':id/download')
  async downloadEpub(@Param('id') id: string, @Res() res: Response) {
    const { stream, filename } = await this.catalogService.getEpubStream(id);

    res.set({
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }
}
