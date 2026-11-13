import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { NotifySubscriberUseCase } from '../../application/use-cases/NotifySubscriberUseCase';
import { Vacancy } from '../../domain/entities/Vacancy';
import { Salary } from '../../domain/value-objects/Salary';

@Controller()
export class VacancyConsumer {
  private readonly logger = new Logger(VacancyConsumer.name);
  private readonly MAX_RETRIES = 3;

  constructor(private readonly notifyUseCase: NotifySubscriberUseCase) {}

  @EventPattern('concursos.new')
  async handleNewVacancy(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log(`[RabbitMqQ]: Nova vaga recebida: ${data.job}`);
    for (let tentativa = 1; tentativa <= this.MAX_RETRIES; tentativa++) {
      try {
        const novaVaga = new Vacancy(
          data.id,
          data.job,
          data.area,
          data.region,
          new Salary(data.salary),
        );

        // Tenta rodar o Caso de Uso
        await this.notifyUseCase.execute(novaVaga);

        // Se chegou aqui, deu certo! Confirmamos o sucesso e saímos do loop
        channel.ack(originalMsg);
        return;
      } catch (error) {
        this.logger.warn(
          `[Tentativa ${tentativa}/${this.MAX_RETRIES}] Falha ao processar vaga ${data.id}: ${error}`,
        );

        // Se ainda temos tentativas restantes, esperamos um tempo exponencial antes do próximo loop
        if (tentativa < this.MAX_RETRIES) {
          const tempoEspera = Math.pow(2, tentativa) * 1000; // 1ª vez: 2s | 2ª vez: 4s
          this.logger.log(
            `Aguardando ${tempoEspera / 1000}s para tentar novamente...`,
          );
          await this.sleep(tempoEspera);
        } else {
          // ESTRATÉGIA FINAL: Esgotaram as tentativas. Jogamos a toalha.
          this.logger.error(
            `🚨 Limite de retries atingido para a vaga ${data.id}. Movendo para a DLQ...`,
          );

          // Nack com requeue=false ativa a nossa configuração e manda para a 'concursos.dlq'
          channel.nack(originalMsg, false, false);
        }
      }
    }
  }

  // Função auxiliar para pausar a execução
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
