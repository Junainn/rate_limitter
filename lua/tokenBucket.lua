-- tokenBucket.lua
-- KEYS[1] = rate limit key
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per millisecond)
-- ARGV[3] = now (timestamp in ms)

local bucket = redis.call("HMGET", KEYS[1], "tokens", "last_refill")

local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize bucket if it doesn't exist
if not tokens then
  tokens = tonumber(ARGV[1])
  last_refill = tonumber(ARGV[3])
end

-- Refill tokens based on elapsed time
local elapsed = tonumber(ARGV[3]) - last_refill
local refill = elapsed * tonumber(ARGV[2])
tokens = math.min(tonumber(ARGV[1]), tokens + refill)

-- Decide
if tokens < 1 then
  -- Not enough tokens → BLOCK (NO mutation)
  redis.call("HMSET", KEYS[1], "tokens", tokens, "last_refill", tonumber(ARGV[3]))
  return {0, tokens}
end

-- Consume token
tokens = tokens - 1

-- Persist state
redis.call(
  "HMSET",
  KEYS[1],
  "tokens",
  tokens,
  "last_refill",
  tonumber(ARGV[3])
)

-- Set TTL defensively (optional cleanup)
redis.call("PEXPIRE", KEYS[1], 60000)

return {1, tokens}


