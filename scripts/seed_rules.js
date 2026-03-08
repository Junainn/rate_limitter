import redis from "../redis.js";

async function seed() {

  await redis.set(
    "rule:free",
    JSON.stringify({
      algorithm: "token-bucket",
      capacity: 10,
      refillRate: 5
    })
  );

  await redis.set(
    "rule:pro",
    JSON.stringify({
      algorithm: "token-bucket",
      capacity: 100,
      refillRate: 10
    })
  );

  await redis.set(
    "rule:strict",
    JSON.stringify({
      algorithm: "sliding-window",
      limit: 5,
      windowMs: 10000
    })
  );

  await redis.set("user:free-key", "free");
  await redis.set("user:pro-key", "pro");
  await redis.set("user:strict-key", "strict");

  console.log("Rules seeded successfully");

  process.exit(0);
}

seed();