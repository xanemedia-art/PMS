import crypto from 'crypto';

/**
 * Validates and retrieves the JWT Secret.
 * Enforces security constraints to prevent token forgery using default keys.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'changeme123' || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY CRITICAL] JWT_SECRET is unset or using default "changeme123" in production! Exiting to prevent token forgery.');
      process.exit(1);
    }
    console.warn('[SECURITY WARNING] JWT_SECRET is unset or using default "changeme123". This is insecure for production.');
    return 'changeme123';
  }
  return secret;
}

/**
 * Escapes HTML characters to prevent XSS and HTML injection in rendered emails and templates.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * In-memory sliding-window rate limiter for sensitive endpoints (e.g. 4-digit PIN logins)
 */
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || (now - entry.firstAttempt) > windowMs) {
    rateLimitMap.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count };
}
