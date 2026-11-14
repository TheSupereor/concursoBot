import { DeliveryResult } from '../../domain/ports/notification-service.port';

interface TelegramApiErrorShape {
  response?: {
    error_code?: number;
    parameters?: { retry_after?: number };
  };
}

/**
 * Maps a failed Telegram Bot API call (a Telegraf TelegramError) to a DeliveryResult.
 * Anything unexpected is treated as retryable: a duplicate retry is safe because of the
 * notification log, a lost alert is not.
 */
export function classifyTelegramError(error: unknown): DeliveryResult {
  const response = (error as TelegramApiErrorShape)?.response;
  const code = response?.error_code;

  if (code === 403) return { status: 'blocked' };

  if (code === 429) {
    return {
      status: 'retryable',
      retryAfterSeconds: response?.parameters?.retry_after,
    };
  }

  if (code !== undefined && code >= 400 && code < 500) {
    return { status: 'invalid' };
  }

  // 5xx, network failures and anything without a Bot API response.
  return { status: 'retryable' };
}
