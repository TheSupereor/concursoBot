import { Subscriber } from "../../domain/entities/Subscriber";
import { Vacancy } from "../../domain/entities/Vacancy";
import { ISubscriberRepository } from "../../domain/ports/IAssinanteRepository";
import { INotificationService } from "../../domain/ports/INotificationService";
import { Preference } from "../../domain/value-objects/Preference";
import { Salary } from "../../domain/value-objects/Salary";
import { NotifySubscriberUseCase } from "./NotifySubscriberUseCase";


describe('Use Case: NotificarAssinantes', () => {
  let useCase: NotifySubscriberUseCase;
  let mockAssinanteRepo: jest.Mocked<ISubscriberRepository>;
  let mockNotificacaoService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    mockAssinanteRepo = {
      save: jest.fn(),
      searchByTelegramId: jest.fn(),
      searchActiveSubscribers: jest.fn(),
    };

    mockNotificacaoService = {
      sendVacancyAlert: jest.fn(),
    };

    // objetos falsos no nosso Caso de Uso
    useCase = new NotifySubscriberUseCase(mockAssinanteRepo, mockNotificacaoService);
  });

  it('deve notificar apenas os assinantes que têm interesse na vaga', async () => {
    // Arrange (Preparação)
    
    // Criamos um assinante que QUER vagas de TI
    const assinanteDeTI = new Subscriber('telegram-1');
    assinanteDeTI.addPreference(new Preference('TI', 'SP', new Salary(5000)));

    // Criamos um assinante que QUER vagas de Direito
    const assinanteDeDireito = new Subscriber('telegram-2');
    assinanteDeDireito.addPreference(new Preference('Direito', 'SP', new Salary(5000)));

    // Instruímos nosso repositório falso a retornar esses dois assinantes
    mockAssinanteRepo.searchActiveSubscribers.mockResolvedValue([assinanteDeTI, assinanteDeDireito]);

    // A vaga que chegou pelo RabbitMQ é de TI
    const vagaNovaTI = new Vacancy('vaga-123', 'Desenvolvedor', 'TI', 'SP', new Salary(8000));

    // Act (Ação)
    await useCase.execute(vagaNovaTI);

    // Assert (Verificação)
    
    // O repositório deve ter sido chamado 1 vez para buscar a galera
    expect(mockAssinanteRepo.searchActiveSubscribers).toHaveBeenCalledTimes(1);

    // O serviço de notificação deve ter sido chamado para o Subscriber 1 (TI)
    expect(mockNotificacaoService.sendVacancyAlert).toHaveBeenCalledWith(assinanteDeTI, vagaNovaTI);

    // O serviço de notificação NÃO deve ter sido chamado para o Subscriber 2 (Direito)
    expect(mockNotificacaoService.sendVacancyAlert).not.toHaveBeenCalledWith(assinanteDeDireito, vagaNovaTI);
  });
});