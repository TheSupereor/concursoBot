import {
  DEAD_LETTER_QUEUE,
  assertDeadLetterQueue,
  vacancyQueueOptions,
} from './rabbitmq.config';

describe('RabbitMQ topology', () => {
  it('dead-letters rejected vacancy messages to the DLQ via the default exchange', () => {
    expect(vacancyQueueOptions).toEqual({
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: DEAD_LETTER_QUEUE,
    });
  });

  it('declares the DLQ as durable without attaching a consumer', async () => {
    const assertQueue = jest.fn().mockResolvedValue({});
    const consume = jest.fn();

    const channel = { assertQueue, consume };

    await assertDeadLetterQueue(channel);

    expect(assertQueue).toHaveBeenCalledWith(DEAD_LETTER_QUEUE, {
      durable: true,
    });
    expect(consume).not.toHaveBeenCalled();
  });
});
