/** Dependency-injection tokens. Ports are interfaces, which do not exist at runtime. */
export const APP_CONFIG = 'APP_CONFIG';
export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const SUBSCRIBER_REPOSITORY = 'ISubscriberRepository';
export const NOTIFICATION_SERVICE = 'INotificationService';
export const NOTIFICATION_LOG_REPOSITORY = 'INotificationLogRepository';
export const PROCESSED_EVENT_REPOSITORY = 'IProcessedEventRepository';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';
export const LOGGER = 'ILogger';

/** Optional override of the vacancy consumer's retry backoff base (milliseconds). */
export const VACANCY_RETRY_BASE_DELAY_MS = 'VACANCY_RETRY_BASE_DELAY_MS';
