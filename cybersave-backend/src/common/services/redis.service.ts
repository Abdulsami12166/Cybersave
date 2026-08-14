import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  private client: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiry: number }>();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && !redisUrl.includes('your_redis')) {
      try {
        const isTls = redisUrl.startsWith('rediss://');

        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 2,
          connectTimeout: 5000,
          enableOfflineQueue: true,
          retryStrategy(times) {
            if (times > 3) return null; // Stop retrying and fallback after 3 attempts
            return Math.min(times * 500, 2000);
          },
          ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
        });

        this.client.on('connect', () => {
          this.logger.log(
            'Connected to remote Redis Cloud instance successfully.',
          );
        });

        this.client.on('error', (err) => {
          this.logger.warn(
            `Redis connection event warning: ${err.message}. Operating with fallback in-memory cache.`,
          );
        });
      } catch (error) {
        this.logger.error('Failed to initialize Redis connection', error);
      }
    } else {
      this.logger.warn(
        'REDIS_URL missing or default placeholder. Operating in in-memory cache mode.',
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (e) {
        // ignore quit error on shutdown
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.client.status === 'ready') {
      try {
        return await this.client.get(key);
      } catch (err) {
        this.logger.warn(
          `Redis get failed: ${err.message}. Using in-memory fallback.`,
        );
      }
    }

    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return cached.value;
  }

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.warn(
          `Redis set failed: ${err.message}. Using in-memory fallback.`,
        );
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        this.logger.warn(
          `Redis del failed: ${err.message}. Using in-memory fallback.`,
        );
      }
    }

    this.memoryCache.delete(key);
  }
}
