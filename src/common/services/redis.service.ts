import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  private client: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiry: number }>();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
        });

        this.client.on('connect', () => {
          this.logger.log('Connected to remote Redis database.');
        });

        this.client.on('error', (err) => {
          this.logger.warn(`Redis connection error: ${err.message}. Falling back to in-memory cache.`);
          this.client = null; // force in-memory fallback
        });
      } catch (error) {
        this.logger.error('Failed to initialize Redis connection', error);
      }
    } else {
      this.logger.warn('REDIS_URL missing from env. Operating in in-memory cache mode.');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        this.logger.warn(`Redis get failed: ${err.message}. Using in-memory fallback.`);
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
    if (this.client) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.warn(`Redis set failed: ${err.message}. Using in-memory fallback.`);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        this.logger.warn(`Redis del failed: ${err.message}. Using in-memory fallback.`);
      }
    }

    this.memoryCache.delete(key);
  }
}
