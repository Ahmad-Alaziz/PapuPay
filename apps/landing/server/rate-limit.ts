type Options = {
  /** Maximum number of requests allowed per window. */
  limit: number;
  windowMs: number;
};

/**
 * Fixed-window, in-memory rate limiter.
 *
 * Good enough as a first line of defence for a contact form. On serverless
 * platforms each instance keeps its own memory, so the limit is per instance.
 * Use a shared store (e.g. Upstash Redis / Vercel KV) if you need a global limit.
 */
export function createRateLimiter({ limit, windowMs }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();

    if (hits.size > 5000) {
      for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k);
    }

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    return {
      allowed: entry.count <= limit,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  };
}
