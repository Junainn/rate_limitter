-- slidingWindow.lua
-- KEYS[1] = rate limit key
-- ARGV[1] = limit
-- ARGV[2] = window size in ms
-- ARGV[3] = current timestamp (ms)

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
redis.call("ZREMRANGEBYSCORE", key, 0, now - window)

-- Get current count
local current = redis.call("ZCARD", key)

-- If limit exceeded → block
if current >= limit then
  return {0, current}
end

-- Otherwise add request
redis.call("ZADD", key, now, now)

-- Set TTL to window size (cleanup)
redis.call("PEXPIRE", key, window)

return {1, current + 1}
