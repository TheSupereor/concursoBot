import { Subscriber } from "../../domain/entities/Subscriber";
import { Vacancy } from "../../domain/entities/Vacancy";
import { ISubscriberRepository } from "../../domain/ports/ISubscriberRepository";
import { INotificationService } from "../../domain/ports/INotificationService";
import { INotificationLogRepository } from "../../domain/ports/INotificationLogRepository";
import { Preference } from "../../domain/value-objects/Preference";
import { Salary } from "../../domain/value-objects/Salary";
import { NotifySubscriberUseCase } from "./NotifySubscriberUseCase";


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
      sendVacancyAlert: jest.fn(),
      sendCustomAlert: jest.fn(),
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
    assinanteDeDireito.addPreference(new Preference('Direito', 'SP', new Salary(5000)));

    mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([assinanteDeTI, assinanteDeDireito]);

    const vagaNovaTI = new Vacancy('vaga-123', 'Desenvolvedor', 'TI', 'SP', new Salary(8000));

    await useCase.execute(vagaNovaTI);

    expect(mockAssinanteRepo.searchActiveSubscribers).toHaveBeenCalledTimes(1);
    expect(mockNotificacaoService.sendVacancyAlert).toHaveBeenCalledWith(assinanteDeTI, vagaNovaTI);
    expect(mockNotificacaoService.sendVacancyAlert).not.toHaveBeenCalledWith(assinanteDeDireito, vagaNovaTI);
  });

  it('não deve notificar se a vaga já foi enviada (idempotência)', async () => {
    const subscriber = new Subscriber('telegram-1', true);
    subscriber.addPreference(new Preference('TI', 'SP', new Salary(0)));

    mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([subscriber]);
    mockNotificationLog.alreadySent.mockResolvedValue(true);

    const vaga = new Vacancy('vaga-duplicada', 'Dev', 'TI', 'SP', new Salary(5000));

    await useCase.execute(vaga);

    expect(mockNotificacaoService.sendVacancyAlert).not.toHaveBeenCalled();
  });
});
