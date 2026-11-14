import { Subscriber } from '../../domain/entities/Subscriber';
import { Vacancy } from '../../domain/entities/Vacancy';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';
import { INotificationService } from '../../domain/ports/INotificationService';
import { INotificationLogRepository } from '../../domain/ports/INotificationLogRepository';
import { Preference } from '../../domain/value-objects/Preference';
import { Salary } from '../../domain/value-objects/Salary';
import { NotifySubscriberUseCase } from './NotifySubscriberUseCase';
import { RetryableDeliveryError } from '../errors/RetryableDeliveryError';

describe('Use Case: NotificarAssinantes', () => {
  let useCase: NotifySubscriberUseCase;
  let mockAssinanteRepo: jest.Mocked<ISubscriberRepository>;
  let mockNotificacaoService: jest.Mocked<INotificationService>;
  let mockNotificationLog: jest.Mocked<INotificationLogRepository>;

  beforeEach(() => {
    mockAssinanteRepo = {
      save: jest.fn(),
      searchByTelegramId: jest.fn(),
      searchActiveSubscribers: jest.fn(),
    };

    mockNotificacaoService = {
      sendVacancyAlert: jest.fn().mockResolvedValue({ status: 'sent' }),
      sendCustomAlert: jest.fn().mockResolvedValue({ status: 'sent' }),
    };

    mockNotificationLog = {
      alreadySent: jest.fn().mockResolvedValue(false),
      registerSent: jest.fn(),
    };

    useCase = new NotifySubscriberUseCase(
      mockAssinanteRepo,
      mockNotificacaoService,
      mockNotificationLog,
    );
  });

  it('deve notificar apenas os assinantes que têm interesse na vaga', async () => {
    const assinanteDeTI = new Subscriber('telegram-1', true);
    assinanteDeTI.addPreference(new Preference('TI', 'SP', new Salary(5000)));

    const assinanteDeDireito = new Subscriber('telegram-2', true);
    assinanteDeDireito.addPreference(
      new Preference('Direito', 'SP', new Salary(5000)),
    );

    mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([
      assinanteDeTI,
      assinanteDeDireito,
    ]);

    const vagaNovaTI = new Vacancy(
      'vaga-123',
      'Desenvolvedor',
      'TI',
      'SP',
      new Salary(8000),
    );

    await useCase.execute(vagaNovaTI);

    expect(mockAssinanteRepo.searchActiveSubscribers).toHaveBeenCalledTimes(1);
    expect(mockNotificacaoService.sendVacancyAlert).toHaveBeenCalledWith(
      assinanteDeTI,
      vagaNovaTI,
    );
    expect(mockNotificacaoService.sendVacancyAlert).not.toHaveBeenCalledWith(
      assinanteDeDireito,
      vagaNovaTI,
    );
  });

  it('não deve notificar se a vaga já foi enviada (idempotência)', async () => {
    const subscriber = new Subscriber('telegram-1', true);
    subscriber.addPreference(new Preference('TI', 'SP', new Salary(0)));

    mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([subscriber]);
    mockNotificationLog.alreadySent.mockResolvedValue(true);

    const vaga = new Vacancy(
      'vaga-duplicada',
      'Dev',
      'TI',
      'SP',
      new Salary(5000),
    );

    await useCase.execute(vaga);

    expect(mockNotificacaoService.sendVacancyAlert).not.toHaveBeenCalled();
  });

  describe('delivery failures', () => {
    const vacancy = new Vacancy('vaga-1', 'Dev', 'TI', 'SP', new Salary(5000));

    const interestedSubscriber = (telegramId: string): Subscriber => {
      const subscriber = new Subscriber(telegramId, true);
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(0)));
      return subscriber;
    };

    it('does not log a vacancy as sent when delivery is retryable, and fails so the message is retried', async () => {
      mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([
        interestedSubscriber('telegram-1'),
      ]);
      mockNotificacaoService.sendVacancyAlert.mockResolvedValue({
        status: 'retryable',
      });

      await expect(useCase.execute(vacancy)).rejects.toBeInstanceOf(
        RetryableDeliveryError,
      );
      expect(mockNotificationLog.registerSent).not.toHaveBeenCalled();
    });

    it('keeps delivering to other subscribers when one delivery is retryable', async () => {
      const failing = interestedSubscriber('telegram-1');
      const healthy = interestedSubscriber('telegram-2');
      mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([
        failing,
        healthy,
      ]);
      mockNotificacaoService.sendVacancyAlert.mockImplementation(
        async (subscriber) =>
          subscriber.telegramId === 'telegram-1'
            ? { status: 'retryable' }
            : { status: 'sent' },
      );

      await expect(useCase.execute(vacancy)).rejects.toBeInstanceOf(
        RetryableDeliveryError,
      );
      expect(mockNotificationLog.registerSent).toHaveBeenCalledTimes(1);
      expect(mockNotificationLog.registerSent).toHaveBeenCalledWith(
        'telegram-2',
        'vaga-1',
      );
    });

    it.each(['blocked', 'invalid'] as const)(
      'skips a %s delivery without retrying or logging it as sent',
      async (status) => {
        mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([
          interestedSubscriber('telegram-1'),
        ]);
        mockNotificacaoService.sendVacancyAlert.mockResolvedValue({ status });

        await expect(useCase.execute(vacancy)).resolves.toBeUndefined();
        expect(mockNotificationLog.registerSent).not.toHaveBeenCalled();
      },
    );
  });
});
