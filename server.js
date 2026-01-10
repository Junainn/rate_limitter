import express from "express";
import redis from "./redis.js";
import { getRuleForApiKey } from "./rules.js";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load Lua script once
const luaScript = fs.readFileSync("./lua/fixedWindow.lua", "utf8");

app.post("/check", async (req, res) => {
  const { apiKey, identity, resource } = req.body;

  if (!apiKey || !identity || !resource) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const rule = getRuleForApiKey(apiKey);
  if (!rule) {
    return res.status(403).json({ error: "Unknown apiKey" });
  }

  if (rule.limit === Infinity) {
    return res.json({ allowed: true });
  }

  const key = `rate:${apiKey}:${identity}:${resource}`;

  const [allowed, current] = await redis.eval(
    luaScript,
    1,
    key,
    rule.limit,
    rule.windowMs
  );

  if (allowed === 0) {
    return res.status(429).json({
      allowed: false,
      current,
      limit: rule.limit
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
