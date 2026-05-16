import { INotificationService } from '../../domain/ports/INotificationService';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';

export class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      console.warn(
        `Tentativa de cancelamento para usuário não encontrado: ${telegramId}`,
      );
      return;
    }

    // 1. Regra de Negócio: Desativa a conta
    subscriber.cancelSubscription();

    // 2. Persiste a mudança no MySQL
    await this.subscriberRepository.save(subscriber);

    // 3. Avisa o usuário de forma amigável para manter as portas abertas
    try {
      // Como a Entidade Vaga não é necessária aqui, podemos adaptar a interface ou criar um método enviarMensagemSimples
      // Para o exemplo, vamos assumir que o bot dispara essa mensagem direta:
      console.log(`[Cancelamento] Assinatura desativada para: ${telegramId}`);
    } catch (error) {
      console.error('Erro ao notificar cancelamento', error);
    }
  }
}
