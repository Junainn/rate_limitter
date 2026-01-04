import express from "express";
import redis from "./redis.js";
import { getRuleForApiKey } from "./rules.js";

const app = express();
const PORT = 3000;

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

  const key = `rate:${apiKey}:${identity}:${resource}`;

  // Naive distributed counter (INTENTIONALLY WRONG)
  const current = await redis.incr(key);

  // Set TTL on first increment
  if (current === 1 && rule.windowMs) {
    await redis.pexpire(key, rule.windowMs);
  }

  // ❗ DO NOT BLOCK YET
  res.json({
    allowed: true,
    currentCount: current,
    limit: rule.limit
  });
});

app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
