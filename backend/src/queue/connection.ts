import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const redisHost = process.env.REDIS_HOST || '127.0.0.1';
export const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const connectionOptions = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err) => {
  console.error('[Redis Client Error]', err.message);
});

redisClient.on('connect', () => {
  console.log(`[Redis Client] Connected to Redis at ${redisHost}:${redisPort}`);
});
