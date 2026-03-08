import redis from "../redis.js";

const ruleCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export async function getRule(apiKey) {

  // Step 1 — get user's plan
  const plan = await redis.get(`user:${apiKey}`);

  if (!plan) {
    return null;
  }

  // Step 2 — check cache
  const cached = ruleCache.get(plan);

  if (cached && cached.expires > Date.now()) {
    return cached.rule;
  }

  // Step 3 — fetch rule from Redis
  const ruleData = await redis.get(`rule:${plan}`);

  if (!ruleData) {
    return null;
  }

  const rule = JSON.parse(ruleData);

  // Step 4 — store in cache
  ruleCache.set(plan, {
    rule,
    expires: Date.now() + CACHE_TTL
  });

  return rule;
}