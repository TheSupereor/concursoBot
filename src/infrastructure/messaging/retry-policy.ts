/** Total delivery attempts per message (the first try plus the retries). */
export const MAX_ATTEMPTS = 3;

/** Delay before retry n (index 0 is the delay before the second attempt). */
export const RETRY_DELAYS_MS = [2000, 4000] as const;

/** Header that carries the attempt number across retry hops. */
export const ATTEMPT_HEADER = 'x-attempt';

export type FailureDecision =
  | { action: 'retry'; delayMs: number; nextAttempt: number }
  | { action: 'dead-letter' };

/** What to do with a message whose processing just failed on the given attempt. */
export function decideOnFailure(attempt: number): FailureDecision {
  const delayMs = RETRY_DELAYS_MS[attempt - 1];
  if (attempt >= MAX_ATTEMPTS || delayMs === undefined) {
    return { action: 'dead-letter' };
  }
  return { action: 'retry', delayMs, nextAttempt: attempt + 1 };
}

/** Attempt number of a message: 1 when it was never retried or the header is malformed. */
export function attemptOf(
  headers: Record<string, unknown> | undefined,
): number {
  const value = headers?.[ATTEMPT_HEADER];
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : 1;
}
