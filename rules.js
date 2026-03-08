// rules.js

/**
 * Rate limit rules per apiKey
 * This is TEMPORARY in-memory data (Day 2 only)
 */

/*const rateLimitRules = {
  "free-key": {
    algorithm: "fixed-window",
    limit: 2,
    windowMs: 10_000
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
};*/

const rateLimitRules = {
  "strict-key": {
    algorithm: "sliding-window",
    limit: 5,
    windowMs: 10000
  },

  "free-key": {
    algorithm: "token-bucket",
    capacity: 10,
    refillRate: 5,

  },

  "pro-key": {
    algorithm: "token-bucket",
    capacity: 100,
    refillRate: 10

  },

  "admin-key": {
    algorithm: "none"

  }
};
/**
 * Resolve rule by apiKey
 */
function getRuleForApiKey(apiKey) {
  return rateLimitRules[apiKey] || null;
}

export { getRuleForApiKey };


// config.js
export const rateLimiterConfig = {
  failureMode: "fail-closed", // or "fail-closed"
  redisTimeoutMs: 100
};
