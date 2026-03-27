/**
 * Simple Logger Utility
 */
export const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta),
  error: (msg, error = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  warn: (msg, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta),
};

/**
 * Basic Rate Limiter (Memory-based, suitable for dev/small scale)
 * In production, use Redis or a dedicated service.
 */
const rateLimitMap = new Map();

export function rateLimit(ip, limit = 50, windowMs = 60000) {
  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, startTime: now };

  if (now - userData.startTime > windowMs) {
    userData.count = 1;
    userData.startTime = now;
  } else {
    userData.count++;
  }

  rateLimitMap.set(ip, userData);

  return userData.count <= limit;
}
