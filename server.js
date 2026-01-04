import express from "express";
import { getRuleForApiKey } from "./rules.js";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/check", (req, res) => {
  const { apiKey, identity, resource } = req.body;

  if (!apiKey || !identity || !resource) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const rule = getRuleForApiKey(apiKey);

  if (!rule) {
    return res.status(403).json({ error: "Unknown apiKey" });
  }

  // IMPORTANT: No enforcement yet
  res.json({
    allowed: true,
    ruleApplied: rule
  });
});

app.listen(PORT, () => {
  console.log(`Rate limiter running on http://localhost:${PORT}`);
});
