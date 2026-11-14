/**
 * Tracks which webhook events were fully processed, so a redelivered event (Stripe delivers
 * at least once) is acknowledged without being applied again.
 *
 *  - process:           the event is new, or a previous attempt did not finish; handle it
 *  - already_processed: a previous attempt finished; acknowledge and skip
 *
 * Events whose handling failed stay unfinished and are handled again on Stripe's retry. That
 * is safe because the handlers themselves are idempotent.
 */
export type EventDecision = 'process' | 'already_processed';

export interface IProcessedEventRepository {
  beginProcessing(eventId: string, eventType: string): Promise<EventDecision>;
  markProcessed(eventId: string): Promise<void>;
}
