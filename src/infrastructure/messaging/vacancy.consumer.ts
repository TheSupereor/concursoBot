import { Controller, Inject, Logger, Optional } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { z } from 'zod';
import { NotifySubscriberUseCase } from '../../application/use-cases/notify-subscriber.use-case';
import { VACANCY_RETRY_BASE_DELAY_MS } from '../../shared/tokens';
import { Vacancy } from '../../domain/entities/vacancy';
import { Salary } from '../../domain/value-objects/salary';

const MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 2000;

/** Shape of a vacancy message published by the scrapers. */
const vacancyMessageSchema = z.object({
  id: z.string().min(1),
  job: z.string(),
  area: z.string(),
  region: z.string(),
  salary: z.number().min(0),
});

interface RabbitChannel {
  ack(message: unknown): void;
  nack(message: unknown, allUpTo: boolean, requeue: boolean): void;
}

@Controller()
export class VacancyConsumer {
  private readonly logger = new Logger(VacancyConsumer.name);

  constructor(
    private readonly notifyUseCase: NotifySubscriberUseCase,
    // Base delay of the exponential backoff (2s, 4s). Optional so Nest does not try to
    // inject a plain number, and overridable so tests do not wait.
    @Optional()
    @Inject(VACANCY_RETRY_BASE_DELAY_MS)
    private readonly baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  ) {}

  @EventPattern('concursos.new')
  async handleNewVacancy(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as RabbitChannel;
    const message = context.getMessage() as unknown;

    const parsed = vacancyMessageSchema.safeParse(payload);
    if (!parsed.success) {
      // A malformed message will never succeed: dead-letter it right away instead of retrying.
      this.logger.error(
        `Malformed vacancy message, sending it to the DLQ: ${parsed.error.issues
          .map((issue) => issue.path.join('.') || 'payload')
          .join(', ')}`,
      );
      channel.nack(message, false, false);
      return;
    }

    const data = parsed.data;
    this.logger.log(`New vacancy received: ${data.job}`);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.notifyUseCase.execute(
          new Vacancy(
            data.id,
            data.job,
            data.area,
            data.region,
            new Salary(data.salary),
          ),
        );
        channel.ack(message);
        return;
      } catch (error) {
        this.logger.warn(
          `[Attempt ${attempt}/${MAX_ATTEMPTS}] Failed to process vacancy ${data.id}: ${errorMessage(error)}`,
        );

        if (attempt < MAX_ATTEMPTS) {
          await sleep(2 ** attempt * (this.baseDelayMs / 2));
        }
      }
    }

    this.logger.error(
      `Retry limit reached for vacancy ${data.id}; sending it to the DLQ`,
    );
    // requeue=false routes the message through the queue's dead-letter exchange to the DLQ.
    channel.nack(message, false, false);
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
