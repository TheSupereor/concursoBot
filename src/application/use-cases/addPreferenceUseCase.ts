import { ISubscriberRepository } from "../../domain/ports/ISubscriberRepository";
import { Preference } from "../../domain/value-objects/Preference";
import { Salary } from "../../domain/value-objects/Salary";

export class AddPreferenceUseCase {
	constructor(private readonly subscriberRepository: ISubscriberRepository) { }

	async execute(telegramId: string, area: string): Promise<void> {
		const subscriber = await this.subscriberRepository.searchByTelegramId(telegramId);
		if (!subscriber) {
			throw new Error('Assinante não encontrado. Digite /start primeiro.');
		}

		// Cria a nova preferência. (Para simplificar agora, vamos fixar a região como "BR" e salário R$ 0)
    // No futuro, você pode criar botões específicos para Região e Salário também!
    const novaPreferencia = new Preference(area, 'BR', new Salary(0));

    // O Domínio se autovalida (verifica se já tem 5 preferências, etc)
    subscriber.addPreference(novaPreferencia);

    // Salva o estado atualizado no banco
    await this.subscriberRepository.save(subscriber);
	}
}