import { Test } from '@nestjs/testing';
import { SignUpSubscriberUseCase } from '../../application/use-cases/SignUpSubscriberUseCase';
import { AddPreferenceUseCase } from '../../application/use-cases/addPreferenceUseCase';
import { RemovePreferenceUseCase } from '../../application/use-cases/removePreferenceUseCase';
import { DefineSalaryUseCase } from '../../application/use-cases/DefineSalaryUseCase';
import { GetSubscriberStatusUseCase } from '../../application/use-cases/GetSubscriberStatusUseCase';
import { TelegramBotUpdate } from './TelegramBotUpdate';

describe('TelegramBotUpdate dependency injection', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('resolves the subscriber repository through its injection token', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramBotUpdate,
        { provide: SignUpSubscriberUseCase, useValue: {} },
        { provide: AddPreferenceUseCase, useValue: {} },
        { provide: RemovePreferenceUseCase, useValue: {} },
        { provide: DefineSalaryUseCase, useValue: {} },
        { provide: GetSubscriberStatusUseCase, useValue: {} },
        { provide: 'ISubscriberRepository', useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(TelegramBotUpdate)).toBeInstanceOf(TelegramBotUpdate);
  });
});
