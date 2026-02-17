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
const slidingWindowLua = fs.readFileSync("./lua/slidingWindow.lua", "utf8");


const metrics = {
  totalRequests: 0,
  allowed: 0,
  blocked: 0,
  degraded: 0,
  redisLatencyMs: 0
};



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
  metrics.totalRequests++;
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
    metrics.allowed++;
    return res.json({ allowed: true });
  }

  const key = `rate:${apiKey}:${identity}:${resource}`;
  const now = Date.now();

  try {
    let result;
    const start = Date.now(); // ⏱ start timing

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
    } else if (rule.algorithm === "sliding-window") {
      result = await withTimeout(
        redis.eval(
          slidingWindowLua,
          1,
          key,
          rule.limit,
          rule.windowMs,
          now
        ),
        rateLimiterConfig.redisTimeoutMs
      );
    } else {
      metrics.degraded++;
      return res.status(500).json({ error: "Unknown algorithm" });
    }

    const latency = Date.now() - start; // ⏱ measure
    metrics.redisLatencyMs = latency;

    const [allowed, remaining] = result;

    // 🔹 Add Rate Limit Headers
    res.set({
      "X-RateLimit-Remaining": remaining,
      "X-RateLimit-Limit": rule.limit || rule.capacity
    });

    if (allowed === 0) {
      metrics.blocked++;
      return res.status(429).json({
        allowed: false,
        remaining
      });
    }

    metrics.allowed++;
    return res.json({
      allowed: true,
      remaining
    });

  } catch (err) {
    console.error("Rate limiter failure:", err.message);

    metrics.degraded++;

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

app.get("/metrics", (req, res) => {
  res.send(metrics);
})

app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
