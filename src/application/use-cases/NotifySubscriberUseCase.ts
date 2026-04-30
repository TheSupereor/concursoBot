import { Vacancy } from "../../domain/entities/Vacancy";
import { ISubscriberRepository } from "../../domain/ports/IAssinanteRepository";
import { INotificationService } from "../../domain/ports/INotificationService";

export class NotifySubscriberUseCase {
	// Dependency Injection here: the use case asks for the interfaces, not real implementations.
	// This is the D from the SOLID
	constructor (
		private readonly subscriberRepository: ISubscriberRepository,
		private readonly notificationService: INotificationService
	) {}

	// execute/handle is the main entry
	async execute(newVacancy: Vacancy): Promise<void> {
		// look for active subscribers
		const activeSubscribers = await this.subscriberRepository.searchActiveSubscribers();

		// for each subscriver, he leaves the decision to the business Rules (domain)
		for (const subscriber of activeSubscribers) {
			const hasInterest = subscriber.hasInterest(newVacancy);
			if (hasInterest) {
				await this.notificationService.sendVacancyAlert(subscriber, newVacancy);

				// TODO: add here idempotency logic - register on the DB the notification sent
			}
		}
	}
}