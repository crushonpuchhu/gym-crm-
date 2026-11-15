import { Redis } from "ioredis";

let client: Redis | null = null;

export function getRedis() {
  if (!client && process.env.REDIS_URL) {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    }).on("error", () => {});
  }
  return client;
}

export function isRedisAvailable() {
  return Boolean(client || process.env.REDIS_URL);
}
