import { classifyTelegramError } from './telegram-delivery';

const apiError = (
  error_code: number,
  parameters?: { retry_after: number },
) => ({
  response: { ok: false, error_code, description: 'x', parameters },
});

describe('classifyTelegramError', () => {
  it('treats 403 (bot blocked by the user) as blocked', () => {
    expect(classifyTelegramError(apiError(403))).toEqual({ status: 'blocked' });
  });

  it('treats 429 as retryable and keeps the retry_after hint', () => {
    expect(classifyTelegramError(apiError(429, { retry_after: 7 }))).toEqual({
      status: 'retryable',
      retryAfterSeconds: 7,
    });
  });

  it('treats other 4xx (bad request, chat not found) as invalid, not retryable', () => {
    expect(classifyTelegramError(apiError(400)).status).toBe('invalid');
  });

  it('treats 5xx as retryable', () => {
    expect(classifyTelegramError(apiError(502)).status).toBe('retryable');
  });

  it('treats errors without a Bot API response (network, timeout) as retryable', () => {
    expect(classifyTelegramError(new Error('ECONNRESET')).status).toBe(
      'retryable',
    );
    expect(classifyTelegramError(undefined).status).toBe('retryable');
  });
});
