import { Subscriber } from '../entities/Subscriber';
import { Vacancy } from '../entities/Vacancy';

/**
 * Outcome of a delivery attempt. Adapters report failures instead of swallowing them so the
 * application can decide whether to retry, give up or record the notification as sent.
 *  - sent:      delivered
 *  - blocked:   the recipient cannot receive messages (e.g. blocked the bot); retrying is useless
 *  - invalid:   the request itself is wrong (bad payload, unknown chat); retrying is useless
 *  - retryable: transient failure (network, rate limit, upstream 5xx)
 */
export type DeliveryResult =
  | { status: 'sent' }
  | { status: 'blocked' }
  | { status: 'invalid' }
  | { status: 'retryable'; retryAfterSeconds?: number };

export interface INotificationService {
  sendVacancyAlert(
    subscriber: Subscriber,
    vacancy: Vacancy,
  ): Promise<DeliveryResult>;
  sendCustomAlert(
    subscriber: Subscriber,
    text: string,
  ): Promise<DeliveryResult>;
}
