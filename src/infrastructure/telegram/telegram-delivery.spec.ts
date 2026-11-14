import { classifyTelegramError } from './telegram-delivery';

const httpError = (status: number, data: unknown = {}) => ({
  isAxiosError: true,
  response: { status, data },
});

describe('classifyTelegramError', () => {
  it('treats 403 (bot blocked by the user) as blocked', () => {
    expect(classifyTelegramError(httpError(403))).toEqual({
      status: 'blocked',
    });
  });

  it('treats 429 as retryable and keeps the retry_after hint', () => {
    expect(
      classifyTelegramError(httpError(429, { parameters: { retry_after: 7 } })),
    ).toEqual({ status: 'retryable', retryAfterSeconds: 7 });
  });

  it('treats other 4xx (bad request, chat not found) as invalid, not retryable', () => {
    expect(classifyTelegramError(httpError(400)).status).toBe('invalid');
  });

  it('treats 5xx as retryable', () => {
    expect(classifyTelegramError(httpError(502)).status).toBe('retryable');
  });

  it('treats errors without a response (network, timeout) as retryable', () => {
    expect(
      classifyTelegramError({ isAxiosError: true, code: 'ECONNRESET' }).status,
    ).toBe('retryable');
    expect(classifyTelegramError(new Error('boom')).status).toBe('retryable');
  });
});
