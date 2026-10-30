import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let prismaService: { $queryRawUnsafe: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return status ok and database latency when database is responsive', async () => {
      const health = await controller.getHealth();
      expect(health.status).toBe('ok');
      expect(health.database.status).toBe('connected');
      expect(health.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.service).toBe('bookies-backend');
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return status degraded gracefully if database throws', async () => {
      prismaService.$queryRawUnsafe.mockRejectedValueOnce(new Error('Connection timeout'));
      const health = await controller.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.database.status).toBe('disconnected');
      expect(health.database.error).toBe('Connection timeout');
    });
  });

  describe('getHomePage', () => {
    it('should return HTML landing page with Bookies branding', () => {
      const html = controller.getHomePage();
      expect(html).toContain('Bookies');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Social EPUB Reader');
      expect(html).toContain('/privacy');
      expect(html).toContain('/health');
    });
  });

  describe('getPrivacyPage', () => {
    it('should return HTML privacy policy page with Google OAuth disclosures', () => {
      const html = controller.getPrivacyPage();
      expect(html).toContain('Privacy Policy');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Google OAuth');
      expect(html).toContain('support@bookies.app');
    });
  });
});
