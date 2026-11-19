import {
  DEAD_LETTER_QUEUE,
  assertTopology,
  retryQueueName,
  vacancyQueueOptions,
} from './rabbitmq.config';
import { RETRY_DELAYS_MS } from './retry-policy';

describe('RabbitMQ topology', () => {
  it('dead-letters rejected vacancy messages to the DLQ via the default exchange', () => {
    expect(vacancyQueueOptions).toEqual({
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: DEAD_LETTER_QUEUE,
    });
  });

  it('names retry queues after the main queue and their delay', () => {
    expect(retryQueueName('concursos.new', 2000)).toBe(
      'concursos.new.retry.2s',
    );
    expect(retryQueueName('concursos.new', 4000)).toBe(
      'concursos.new.retry.4s',
    );
  });

  describe('assertTopology', () => {
    const declare = async () => {
      const assertQueue = jest.fn().mockResolvedValue({});
      const consume = jest.fn();
      const channel = { assertQueue, consume };
      await assertTopology(channel, 'concursos.new');
      return { assertQueue, consume };
    };

    it('declares the DLQ as durable without attaching a consumer', async () => {
      const { assertQueue, consume } = await declare();

      expect(assertQueue).toHaveBeenCalledWith(DEAD_LETTER_QUEUE, {
        durable: true,
      });
      expect(consume).not.toHaveBeenCalled();
    });

    it('declares one TTL retry queue per delay that returns messages to the main queue', async () => {
      const { assertQueue } = await declare();

      for (const delayMs of RETRY_DELAYS_MS) {
        expect(assertQueue).toHaveBeenCalledWith(
          retryQueueName('concursos.new', delayMs),
          {
            durable: true,
            messageTtl: delayMs,
            deadLetterExchange: '',
            deadLetterRoutingKey: 'concursos.new',
          },
        );
      }
    });

    it('never attaches a consumer to any retry queue', async () => {
      const { consume } = await declare();

      expect(consume).not.toHaveBeenCalled();
    });
  });
});
