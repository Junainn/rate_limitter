import express from "express";
import redis from "./redis.js";
import { getRuleForApiKey } from "./rules.js";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load Lua scripts once
const tokenBucketLua = fs.readFileSync("./lua/tokenBucket.lua", "utf8");
const fixedWindowLua = fs.readFileSync("./lua/fixedWindow.lua", "utf8");

app.post("/check", async (req, res) => {
  const { apiKey, identity, resource } = req.body;

  if (!apiKey || !identity || !resource) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const rule = getRuleForApiKey(apiKey);
  if (!rule) {
    return res.status(403).json({ error: "Unknown apiKey" });
  }

  // Unlimited
  if (rule.algorithm === "none") {
    return res.json({ allowed: true });
  }

  const key = `rate:${apiKey}:${identity}:${resource}`;
  const now = Date.now();

  let result;

  if (rule.algorithm === "token-bucket") {
    result = await redis.eval(
      tokenBucketLua,
      1,
      key,
      rule.capacity,
      rule.refillRate / 1000, // tokens per ms
      now
    );
  } else if (rule.algorithm === "fixed-window") {
    result = await redis.eval(
      fixedWindowLua,
      1,
      key,
      rule.limit,
      rule.windowMs
    );
  } else {
    return res.status(500).json({ error: "Unknown algorithm" });
  }

  const [allowed, remaining] = result;

  if (allowed === 0) {
    return res.status(429).json({
      allowed: false,
      remaining
    });
  }

  return res.json({
    allowed: true,
    remaining
  });
});

app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
