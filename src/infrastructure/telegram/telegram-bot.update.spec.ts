import { Test } from '@nestjs/testing';
import { SignUpSubscriberUseCase } from '../../application/use-cases/sign-up-subscriber.use-case';
import { AddPreferenceUseCase } from '../../application/use-cases/add-preference.use-case';
import { RemovePreferenceUseCase } from '../../application/use-cases/remove-preference.use-case';
import { DefineSalaryUseCase } from '../../application/use-cases/define-salary.use-case';
import { GetSubscriberStatusUseCase } from '../../application/use-cases/get-subscriber-status.use-case';
import {
  APP_CONFIG,
  STRIPE_CLIENT,
  SUBSCRIBER_REPOSITORY,
} from '../../shared/tokens';
import { TelegramBotUpdate } from './telegram-bot.update';

describe('TelegramBotUpdate dependency injection', () => {
  it('resolves the subscriber repository through its injection token', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramBotUpdate,
        { provide: SignUpSubscriberUseCase, useValue: {} },
        { provide: AddPreferenceUseCase, useValue: {} },
        { provide: RemovePreferenceUseCase, useValue: {} },
        { provide: DefineSalaryUseCase, useValue: {} },
        { provide: GetSubscriberStatusUseCase, useValue: {} },
        { provide: SUBSCRIBER_REPOSITORY, useValue: {} },
        { provide: STRIPE_CLIENT, useValue: {} },
        { provide: APP_CONFIG, useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(TelegramBotUpdate)).toBeInstanceOf(TelegramBotUpdate);
  });
});
