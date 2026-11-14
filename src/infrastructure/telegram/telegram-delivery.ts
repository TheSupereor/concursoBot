import { DeliveryResult } from '../../domain/ports/notification-service.port';

interface HttpErrorShape {
  response?: {
    status?: number;
    data?: { parameters?: { retry_after?: number } };
  };
}

/**
 * Maps a failed Telegram Bot API call to a DeliveryResult.
 * Anything unexpected is treated as retryable: a duplicate retry is safe because of the
 * notification log, a lost alert is not.
 */
export function classifyTelegramError(error: unknown): DeliveryResult {
  const status = (error as HttpErrorShape)?.response?.status;

  if (status === 403) return { status: 'blocked' };

  if (status === 429) {
    const retryAfterSeconds = (error as HttpErrorShape).response?.data
      ?.parameters?.retry_after;
    return { status: 'retryable', retryAfterSeconds };
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return { status: 'invalid' };
  }

  return { status: 'retryable' };
}
