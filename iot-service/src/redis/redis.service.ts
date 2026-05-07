import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private connected = false;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null; // No reintentar indefinidamente
        return Math.min(times * 500, 2000);
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Conectado a Redis');
    });

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis no disponible: ${err.message}`);
    });

    this.client.connect().catch(() => {
      this.logger.warn('Redis no disponible — los eventos se descartarán');
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async publish(channel: string, data: object): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.publish(channel, JSON.stringify(data));
    } catch {
      // Si Redis falla, el sistema sigue funcionando (degradación elegante)
    }
  }
}
