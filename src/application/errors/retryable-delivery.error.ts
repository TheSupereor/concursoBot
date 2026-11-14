/**
 * Raised when a notification could not be delivered for a transient reason (network error,
 * Telegram 429/5xx). The messaging layer treats it as a failure so the vacancy message is
 * retried and, after the retry limit, dead-lettered instead of being silently acknowledged.
 */
export class RetryableDeliveryError extends Error {
  constructor(
    public readonly vacancyId: string,
    public readonly failedSubscribers: number,
  ) {
    super(
      `Delivery of vacancy ${vacancyId} failed transiently for ${failedSubscribers} subscriber(s)`,
    );
    this.name = 'RetryableDeliveryError';
  }
}
