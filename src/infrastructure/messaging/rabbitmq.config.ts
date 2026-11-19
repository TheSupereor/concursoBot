import * as amqp from 'amqplib';
import { RETRY_DELAYS_MS } from './retry-policy';

export const DEAD_LETTER_QUEUE = 'concursos.dlq';

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

/** Name of the TTL queue that holds a message for `delayMs` before it returns to the main queue. */
export const retryQueueName = (mainQueue: string, delayMs: number): string =>
  `${mainQueue}.retry.${delayMs / 1000}s`;

interface QueueDeclarer {
  assertQueue(
    queue: string,
    options: {
      durable: boolean;
      messageTtl?: number;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
    },
  ): Promise<unknown>;
}

/**
 * Declares the queues that surround the main vacancy queue:
 *
 *  - the dead-letter queue, which retains rejected messages. It has no consumer, so messages
 *    stay ready for inspection and manual replay and the DLQ monitor can count them;
 *  - one retry queue per backoff delay. A message waits there for its TTL and is then
 *    dead-lettered back to the main queue, so a retry never occupies a consumer slot.
 */
export async function assertTopology(
  channel: QueueDeclarer,
  mainQueue: string,
): Promise<void> {
  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });

  for (const delayMs of RETRY_DELAYS_MS) {
    await channel.assertQueue(retryQueueName(mainQueue, delayMs), {
      durable: true,
      messageTtl: delayMs,
      deadLetterExchange: '',
      deadLetterRoutingKey: mainQueue,
    });
  }
}

export async function ensureTopology(
  url: string,
  mainQueue: string,
): Promise<void> {
  const connection = await amqp.connect(url);
  try {
    const channel = await connection.createChannel();
    await assertTopology(channel, mainQueue);
    await channel.close();
  } finally {
    await connection.close();
  }
}
