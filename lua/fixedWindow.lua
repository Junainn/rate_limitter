-- fixedWindow.lua

-- KEYS[1] = rate limit key
-- ARGV[1] = limit
-- ARGV[2] = window duration in milliseconds

local current = redis.call("GET", KEYS[1])

-- If key does not exist, treat count as 0
if not current then
  current = 0
else
  current = tonumber(current)
end

-- If limit already reached, block WITHOUT mutating state
if current >= tonumber(ARGV[1]) then
  return {0, current}
end

-- Otherwise, increment
current = redis.call("INCR", KEYS[1])

-- Set TTL only on first increment
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
end

-- Allow request
return {1, current}
