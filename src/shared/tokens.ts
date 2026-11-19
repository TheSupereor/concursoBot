/** Dependency-injection tokens. Ports are interfaces, which do not exist at runtime. */
export const APP_CONFIG = 'APP_CONFIG';
export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const SUBSCRIBER_REPOSITORY = 'ISubscriberRepository';
export const NOTIFICATION_SERVICE = 'INotificationService';
export const NOTIFICATION_LOG_REPOSITORY = 'INotificationLogRepository';
export const PROCESSED_EVENT_REPOSITORY = 'IProcessedEventRepository';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';
export const LOGGER = 'ILogger';

export const VACANCY_REPOSITORY = 'IVacancyRepository';
export const VACANCY_PUBLISHER = 'IVacancyPublisher';
export const VACANCY_SOURCES = 'VACANCY_SOURCES';
export const JOB_LOCK = 'IJobLock';
