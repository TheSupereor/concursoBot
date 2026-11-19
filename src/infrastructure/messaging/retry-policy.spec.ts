import {
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  attemptOf,
  decideOnFailure,
} from './retry-policy';

describe('retry policy', () => {
  it('allows three attempts in total', () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(RETRY_DELAYS_MS).toHaveLength(MAX_ATTEMPTS - 1);
  });

  it('retries after a growing delay while attempts remain', () => {
    expect(decideOnFailure(1)).toEqual({
      action: 'retry',
      delayMs: 2000,
      nextAttempt: 2,
    });
    expect(decideOnFailure(2)).toEqual({
      action: 'retry',
      delayMs: 4000,
      nextAttempt: 3,
    });
  });

  it('dead-letters once the attempts are exhausted', () => {
    expect(decideOnFailure(3)).toEqual({ action: 'dead-letter' });
    expect(decideOnFailure(7)).toEqual({ action: 'dead-letter' });
  });

  describe('attemptOf', () => {
    it('is 1 for a message that was never retried', () => {
      expect(attemptOf(undefined)).toBe(1);
      expect(attemptOf({})).toBe(1);
    });

    it('reads the attempt counter from the headers', () => {
      expect(attemptOf({ 'x-attempt': 2 })).toBe(2);
    });

    it.each([['two'], [-3], [0], [Number.NaN], [1.5], [null]])(
      'ignores a malformed counter (%p)',
      (value) => {
        expect(attemptOf({ 'x-attempt': value })).toBe(1);
      },
    );
  });
});
