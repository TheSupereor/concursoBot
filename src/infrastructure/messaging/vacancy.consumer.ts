import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { z } from 'zod';
import { NotifySubscriberUseCase } from '../../application/use-cases/notify-subscriber.use-case';
import { Vacancy } from '../../domain/entities/vacancy';
import { Salary } from '../../domain/value-objects/salary';
import { AppConfig } from '../../shared/config/app.config';
import { APP_CONFIG } from '../../shared/tokens';
import { retryQueueName } from './rabbitmq.config';
import {
  ATTEMPT_HEADER,
  MAX_ATTEMPTS,
  attemptOf,
  decideOnFailure,
} from './retry-policy';

/** Shape of a vacancy message published by the scrapers. */
const vacancyMessageSchema = z.object({
  id: z.string().min(1),
  job: z.string(),
  area: z.string(),
  region: z.string(),
  salary: z.number().min(0),
});

interface RabbitMessage {
  content: Buffer;
  properties?: { headers?: Record<string, unknown> };
}

interface RabbitChannel {
  ack(message: unknown): void;
  nack(message: unknown, allUpTo: boolean, requeue: boolean): void;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { persistent: boolean; headers: Record<string, unknown> },
  ): boolean;
}

@Controller()
export class VacancyConsumer {
  private readonly logger = new Logger(VacancyConsumer.name);

  constructor(
    private readonly notifyUseCase: NotifySubscriberUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @EventPattern('concursos.new')
  async handleNewVacancy(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as RabbitChannel;
    const message = context.getMessage() as RabbitMessage;

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
    const attempt = attemptOf(message.properties?.headers);
    this.logger.log(`New vacancy received: ${data.job} (attempt ${attempt})`);

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
    } catch (error) {
      this.handleFailure(channel, message, data.id, attempt, error);
    }
  }

  /**
   * Schedules a retry on the TTL queue that matches the backoff, or dead-letters the message.
   * The retry copy is published before the original is acknowledged, so a crash in between
   * duplicates the message at worst (harmless: notifications are idempotent) and never loses it.
   */
  private handleFailure(
    channel: RabbitChannel,
    message: RabbitMessage,
    vacancyId: string,
    attempt: number,
    error: unknown,
  ): void {
    const reason = error instanceof Error ? error.message : 'unknown error';
    const decision = decideOnFailure(attempt);

    if (decision.action === 'dead-letter') {
      this.logger.error(
        `Vacancy ${vacancyId} failed ${MAX_ATTEMPTS} times (${reason}); sending it to the DLQ`,
      );
      // requeue=false routes the message through the queue's dead-letter exchange to the DLQ.
      channel.nack(message, false, false);
      return;
    }

    this.logger.warn(
      `[Attempt ${attempt}/${MAX_ATTEMPTS}] Failed to process vacancy ${vacancyId}: ${reason}. Retrying in ${decision.delayMs / 1000}s`,
    );
    channel.publish(
      '',
      retryQueueName(this.config.rabbitmq.queue, decision.delayMs),
      message.content,
      {
        persistent: true,
        headers: {
          ...message.properties?.headers,
          [ATTEMPT_HEADER]: decision.nextAttempt,
        },
      },
    );
    channel.ack(message);
  }
}
