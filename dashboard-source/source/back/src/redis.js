import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});

export const subscriber = redis.duplicate();

redis.on("error", (err) => console.error("Redis error:", err));
subscriber.on("error", (err) =>
  console.error("Redis subscriber error:", err)
);

export async function connectRedis() {
  await redis.connect();
  await subscriber.connect();
}
