import expressRateLimit from 'express-rate-limit';

/**
 * express-rate-limit, created on the first request instead of at import time:
 * its memory store starts a timer, which Cloudflare Workers only allow inside a request.
 * On Workers the counters are kept per server instance (best effort), on Node per process.
 */
export default function rateLimit(options) {
  let limiter;
  return (req, res, next) => {
    limiter ??= expressRateLimit({ validate: false, ...options });
    return limiter(req, res, next);
  };
}
