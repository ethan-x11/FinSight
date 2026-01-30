export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 400
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const backoff = baseDelayMs * Math.pow(2, i);
      const jitter = Math.floor(Math.random() * 100);
      await new Promise((res) => setTimeout(res, backoff + jitter));
    }
  }
  throw lastErr;
}
