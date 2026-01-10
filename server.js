import express from "express";
import redis from "./redis.js";
import { getRuleForApiKey } from "./rules.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/check", async (req, res) => {
  const { apiKey, identity, resource } = req.body;

  if (!apiKey || !identity || !resource) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const rule = getRuleForApiKey(apiKey);
  if (!rule) {
    return res.status(403).json({ error: "Unknown apiKey" });
  }

  // Unlimited rule (admin)
  if (rule.limit === Infinity) {
    return res.json({ allowed: true });
  }

  const key = `rate:${apiKey}:${identity}:${resource}`;

  const current = await redis.incr(key);

  // Set TTL only once per window
  if (current === 1 && rule.windowMs) {
    await redis.pexpire(key, rule.windowMs);
  }

  // 🚨 ENFORCEMENT STARTS HERE
  if (current > rule.limit) {
    return res.status(429).json({
      allowed: false,
      reason: "Rate limit exceeded",
      limit: rule.limit,
      current
    });
  }

  return res.json({
    allowed: true,
    current,
    limit: rule.limit
  });
});

app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
