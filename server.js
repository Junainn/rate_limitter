import express from "express";
import redis from "./redis.js";
import { getRuleForApiKey } from "./rules.js";
import { rateLimiterConfig } from "./rules.js";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load Lua scripts once
const tokenBucketLua = fs.readFileSync("./lua/tokenBucket.lua", "utf8");
const fixedWindowLua = fs.readFileSync("./lua/fixedWindow.lua", "utf8");


function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Redis timeout"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}




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

  try {
    let result;

    if (rule.algorithm === "token-bucket") {
      result = await withTimeout(
        redis.eval(
          tokenBucketLua,
          1,
          key,
          rule.capacity,
          rule.refillRate / 1000,
          now
        ),
        rateLimiterConfig.redisTimeoutMs
      );
    } else if (rule.algorithm === "fixed-window") {
      result = await withTimeout(
        redis.eval(
          fixedWindowLua,
          1,
          key,
          rule.limit,
          rule.windowMs
        ),
        rateLimiterConfig.redisTimeoutMs
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

  } catch (err) {
    console.error("Rate limiter failure:", err.message);

    if (rateLimiterConfig.failureMode === "fail-open") {
      return res.json({
        allowed: true,
        degraded: true
      });
    } else {
      return res.status(503).json({
        allowed: false,
        error: "Rate limiter unavailable"
      });
    }
  }
});


app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
