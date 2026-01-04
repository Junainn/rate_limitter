// rules.js

/**
 * Rate limit rules per apiKey
 * This is TEMPORARY in-memory data (Day 2 only)
 */

const rateLimitRules = {
  "free-key": {
    algorithm: "fixed-window",
    limit: 10,
    windowMs: 60_000
  },

  "pro-key": {
    algorithm: "fixed-window",
    limit: 100,
    windowMs: 60_000
  },

  "admin-key": {
    algorithm: "none",
    limit: Infinity,
    windowMs: null
  }
};

/**
 * Resolve rule by apiKey
 */
function getRuleForApiKey(apiKey) {
  return rateLimitRules[apiKey] || null;
}

export { getRuleForApiKey };
