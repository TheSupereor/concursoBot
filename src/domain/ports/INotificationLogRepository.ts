/**
 * Outcome of trying to reserve the right to notify a subscriber about a vacancy.
 *  - claimed:         the caller now owns the delivery and must finish it with
 *                     markSent, markFailed or release
 *  - already_handled: the pair was already delivered (or permanently failed); skip it
 *  - in_progress:     another worker owns it right now; the caller should retry later
 *                     instead of acknowledging, because that worker may still crash
 */
export type ClaimResult = 'claimed' | 'already_handled' | 'in_progress';

/**
 * Notification log used for idempotency. The reservation is atomic (claim-first): a
 * subscriber is claimed *before* delivery, so concurrent consumers or a redelivered
 * message can never both send the same alert.
 */
export interface INotificationLogRepository {
  claim(telegramId: string, vacancyId: string): Promise<ClaimResult>;
  /** Delivery succeeded. */
  markSent(telegramId: string, vacancyId: string): Promise<void>;
  /** Delivery failed permanently (blocked or invalid recipient); never retry. */
  markFailed(telegramId: string, vacancyId: string): Promise<void>;
  /** Delivery failed transiently; free the claim so a retry can take it. */
  release(telegramId: string, vacancyId: string): Promise<void>;
}
