import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const redisHost = process.env.REDIS_HOST || '127.0.0.1';
export const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
export const redisPassword = process.env.REDIS_PASSWORD || undefined;

const isTlsRequired =
  process.env.REDIS_TLS === 'true' ||
  (process.env.NODE_ENV === 'production' && Boolean(process.env.REDIS_PASSWORD)) ||
  redisHost.includes('upstash.io');

export const connectionOptions: RedisOptions = {
  host: redisHost,
  port: redisPort,
  ...(redisPassword ? { password: redisPassword } : {}),
  ...(isTlsRequired ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisClient = new Redis(connectionOptions);

redisClient.on('error', (err) => {
  console.error('[Redis Client Error]', err.message);
});

redisClient.on('connect', () => {
  console.log(`[Redis Client] Connected to Redis at ${redisHost}:${redisPort}${isTlsRequired ? ' (TLS)' : ''}`);
});

