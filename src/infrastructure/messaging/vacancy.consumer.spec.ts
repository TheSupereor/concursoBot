import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { NotifySubscriberUseCase } from '../../application/use-cases/notify-subscriber.use-case';
import { VacancyConsumer } from './vacancy.consumer';

describe('VacancyConsumer', () => {
  const message = { content: Buffer.from('{}') };
  const validPayload = {
    id: 'v1',
    job: 'Analista',
    area: 'TI',
    region: 'SP',
    salary: 5000,
  };

  let execute: jest.Mock;
  let ack: jest.Mock;
  let nack: jest.Mock;
  let consumer: VacancyConsumer;
  let context: RmqContext;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    execute = jest.fn().mockResolvedValue(undefined);
    ack = jest.fn();
    nack = jest.fn();
    context = {
      getChannelRef: () => ({ ack, nack }),
      getMessage: () => message,
    } as unknown as RmqContext;
    // No backoff delay in tests.
    consumer = new VacancyConsumer(
      { execute } as unknown as NotifySubscriberUseCase,
      0,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('acknowledges a vacancy that was processed', async () => {
    await consumer.handleNewVacancy(validPayload, context);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it.each([
    ['not an object', 'garbage'],
    ['a missing id', { ...validPayload, id: undefined }],
    ['a negative salary', { ...validPayload, salary: -1 }],
    ['a salary that is not a number', { ...validPayload, salary: 'a lot' }],
  ])(
    'dead-letters a malformed payload (%s) immediately, without retrying',
    async (_label, payload) => {
      await consumer.handleNewVacancy(payload, context);

      expect(execute).not.toHaveBeenCalled();
      expect(nack).toHaveBeenCalledWith(message, false, false);
      expect(ack).not.toHaveBeenCalled();
    },
  );

  it('retries a transient failure and acknowledges once it succeeds', async () => {
    execute
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(undefined);

    await consumer.handleNewVacancy(validPayload, context);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it('dead-letters the message after three failed attempts', async () => {
    execute.mockRejectedValue(new Error('still down'));

    await consumer.handleNewVacancy(validPayload, context);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(nack).toHaveBeenCalledWith(message, false, false);
    expect(ack).not.toHaveBeenCalled();
  });
});
