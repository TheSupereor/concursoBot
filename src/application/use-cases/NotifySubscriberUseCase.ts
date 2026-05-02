import { Vacancy } from "../../domain/entities/Vacancy";
import { ISubscriberRepository } from "../../domain/ports/ISubscriberRepository";
import { INotificationService } from "../../domain/ports/INotificationService";
import { INotificationLogRepository } from "../../domain/ports/INotificationLogRepository";

export class NotifySubscriberUseCase {
	// Dependency Injection here: the use case asks for the interfaces, not real implementations.
	// This is the D from the SOLID
	constructor (
		private readonly subscriberRepository: ISubscriberRepository,
		private readonly notificationService: INotificationService,
		private readonly notificationLogRepository: INotificationLogRepository,
	) {}

	// execute/handle is the main entry
	async execute(newVacancy: Vacancy): Promise<void> {
		// look for active subscribers
		const activeSubscribers = await this.subscriberRepository.searchActiveSubscribers();

		// for each subscriver, he leaves the decision to the business Rules (domain)
		for (const subscriber of activeSubscribers) {
			const hasInterest = subscriber.hasInterest(newVacancy);
			if (hasInterest) {
				const alreadySent = await this.notificationLogRepository.alreadySent(
          subscriber.telegramId, 
          newVacancy.id
        );

        if (alreadySent) {
          console.log(`[Idempotência] Vaga ${newVacancy.id} já enviada para ${subscriber.telegramId}. Pulando...`);
          continue; // Pula para a próxima pessoa da fila
        }

				await this.notificationService.sendVacancyAlert(subscriber, newVacancy);
				await this.notificationLogRepository.registerSent(subscriber.telegramId, newVacancy.id);
			}
		}
	}
}