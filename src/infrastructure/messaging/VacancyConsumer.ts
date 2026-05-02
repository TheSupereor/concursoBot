import { Controller } from "@nestjs/common";
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { NotifySubscriberUseCase } from "../../application/use-cases/NotifySubscriberUseCase";
import { Vacancy } from "../../domain/entities/Vacancy";
import { Salary } from "../../domain/value-objects/Salary";

@Controller()
export class VacancyConsumer {
	constructor(
		private readonly notifyUseCase: NotifySubscriberUseCase
	) { }

	@EventPattern('concursos.new')
	async handleNewVacancy(@Payload() data: any, @Ctx() context: RmqContext){
		const channel = context.getChannelRef();
		const originalMsg = context.getMessage();

		try{
			console.log(`[RabbitMqQ]: Nova vaga recebida: ${data.job}`);

			const newVacancy = new Vacancy(
				data.id,
				data.job,
				data.area,
				data.region,
				new Salary(data.salary)
			);

			await this.notifyUseCase.execute(newVacancy);
			channel.ack(originalMsg);
		} catch (error) {
			console.error('Erro ao processar vaga de fila', error);
			// lanćar para uma dead letter queue
			channel.nack(originalMsg, false, false);
		}
	}
}