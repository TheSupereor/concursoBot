import * as amqp from 'amqplib';

export const DEAD_LETTER_QUEUE = 'concursos.dlq';

export const rabbitMqUrl = (): string =>
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export const vacancyQueueName = (): string =>
  process.env.RABBITMQ_QUEUE || 'concursos.new';

/**
 * Single source of truth for the vacancy queue arguments. RabbitMQ rejects a queue
 * re-declaration with different arguments (PRECONDITION_FAILED), so the consumer and
 * the publisher must both use exactly this object.
 */
export const vacancyQueueOptions = {
  durable: true,
  deadLetterExchange: '',
  deadLetterRoutingKey: DEAD_LETTER_QUEUE,
} as const;

interface QueueDeclarer {
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
}

/**
 * Declares the dead-letter queue so rejected messages are retained. The DLQ must have
 * no consumer: messages stay ready for inspection and manual replay, and the DLQ monitor
 * relies on that count.
 */
export async function assertDeadLetterQueue(
  channel: QueueDeclarer,
): Promise<void> {
  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
}

export async function ensureDeadLetterQueue(): Promise<void> {
  const connection = await amqp.connect(rabbitMqUrl());
  try {
    const channel = await connection.createChannel();
    await assertDeadLetterQueue(channel);
    await channel.close();
  } finally {
    await connection.close();
  }
}
