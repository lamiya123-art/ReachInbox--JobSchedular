import { redisClient } from '../queue/connection';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  nextWindowStart?: Date;
}

// Atomic Lua script: INCR counter, set EXPIRE on first increment
const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

export async function checkSenderRateLimit(
  senderId: string,
  maxHourlyLimit: number = 200
): Promise<RateLimitResult> {
  const now = new Date();

  // Hour window key format: rate:{senderId}:YYYY-MM-DDTHH
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowKey = `rate:${senderId}:${year}-${month}-${day}T${hour}`;

  // Execute atomic Lua script in Redis
  const currentCountResult = (await redisClient.eval(
    RATE_LIMIT_LUA_SCRIPT,
    1,
    windowKey,
    3600 // 1 hour TTL
  )) as number;

  if (currentCountResult > maxHourlyLimit) {
    // Calculate start of next UTC hour window
    const nextWindowStart = new Date(now);
    nextWindowStart.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);

    return {
      allowed: false,
      currentCount: currentCountResult,
      nextWindowStart,
    };
  }

  return {
    allowed: true,
    currentCount: currentCountResult,
  };
}
