import { Module } from '@nestjs/common';
import { AddPreferenceUseCase } from '../application/use-cases/add-preference.use-case';
import { CancelSubscriptionUseCase } from '../application/use-cases/cancel-subscription.use-case';
import { DefineSalaryUseCase } from '../application/use-cases/define-salary.use-case';
import { GetSubscriberStatusUseCase } from '../application/use-cases/get-subscriber-status.use-case';
import { ProcessApprovedPaymentUseCase } from '../application/use-cases/process-approved-payment.use-case';
import { RemovePreferenceUseCase } from '../application/use-cases/remove-preference.use-case';
import { SignUpSubscriberUseCase } from '../application/use-cases/sign-up-subscriber.use-case';
import { provideUseCase } from '../shared/provide-use-case';
import { NOTIFICATION_SERVICE, SUBSCRIBER_REPOSITORY } from '../shared/tokens';
import { PersistenceModule } from './persistence.module';
import { TelegramModule } from './telegram.module';

const repository = [SUBSCRIBER_REPOSITORY];
const repositoryAndNotifier = [SUBSCRIBER_REPOSITORY, NOTIFICATION_SERVICE];

/** Subscriber lifecycle: sign-up, preferences, salary filter, activation and cancellation. */
@Module({
  imports: [PersistenceModule, TelegramModule],
  providers: [
    provideUseCase(SignUpSubscriberUseCase, repository),
    provideUseCase(AddPreferenceUseCase, repository),
    provideUseCase(RemovePreferenceUseCase, repository),
    provideUseCase(DefineSalaryUseCase, repository),
    provideUseCase(GetSubscriberStatusUseCase, repository),
    provideUseCase(ProcessApprovedPaymentUseCase, repositoryAndNotifier),
    provideUseCase(CancelSubscriptionUseCase, repositoryAndNotifier),
  ],
  exports: [
    SignUpSubscriberUseCase,
    AddPreferenceUseCase,
    RemovePreferenceUseCase,
    DefineSalaryUseCase,
    GetSubscriberStatusUseCase,
    ProcessApprovedPaymentUseCase,
    CancelSubscriptionUseCase,
  ],
})
export class SubscribersModule {}
