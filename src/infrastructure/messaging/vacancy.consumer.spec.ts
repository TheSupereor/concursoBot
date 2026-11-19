import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { NotifySubscriberUseCase } from '../../application/use-cases/notify-subscriber.use-case';
import { Vacancy } from '../../domain/entities/vacancy';
import { AppConfig } from '../../shared/config/app.config';
import { APP_CONFIG } from '../../shared/tokens';
import { VacancyConsumer } from './vacancy.consumer';

const QUEUE = 'concursos.new';

describe('VacancyConsumer', () => {
  const validPayload = {
    id: 'v1',
    job: 'Analista',
    areas: ['TI'],
    region: 'SP',
    salary: 5000,
  };
  const content = Buffer.from(JSON.stringify({ data: validPayload }));
  const config = { rabbitmq: { queue: QUEUE } } as AppConfig;

  let execute: jest.Mock;
  let ack: jest.Mock;
  let nack: jest.Mock;
  let publish: jest.Mock;
  let consumer: VacancyConsumer;

  const contextFor = (headers?: Record<string, unknown>): RmqContext => {
    const message = { content, properties: { headers } };
    return {
      getChannelRef: () => ({ ack, nack, publish }),
      getMessage: () => message,
    } as unknown as RmqContext;
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    execute = jest.fn().mockResolvedValue(undefined);
    ack = jest.fn();
    nack = jest.fn();
    publish = jest.fn().mockReturnValue(true);
    consumer = new VacancyConsumer(
      { execute } as unknown as NotifySubscriberUseCase,
      config,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('can be built by Nest dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VacancyConsumer],
      providers: [
        { provide: NotifySubscriberUseCase, useValue: {} },
        { provide: APP_CONFIG, useValue: config },
      ],
    }).compile();

    expect(moduleRef.get(VacancyConsumer)).toBeInstanceOf(VacancyConsumer);
  });

  it('acknowledges a vacancy that was processed', async () => {
    const context = contextFor();

    await consumer.handleNewVacancy(validPayload, context);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(ack).toHaveBeenCalledWith(context.getMessage());
    expect(nack).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('passes the link, organization and deadline on to the use case', async () => {
    await consumer.handleNewVacancy(
      {
        ...validPayload,
        areas: ['EDUCACAO', 'TI'],
        url: 'https://example.test/edital',
        organization: 'Prefeitura de Exemplo',
        deadline: '2026-12-14',
      },
      contextFor(),
    );

    const vacancy = execute.mock.calls[0]?.[0] as Vacancy;
    expect(vacancy.areas).toEqual(['EDUCACAO', 'TI']);
    expect(vacancy.details).toEqual({
      url: 'https://example.test/edital',
      organization: 'Prefeitura de Exemplo',
      deadline: new Date('2026-12-14T00:00:00.000Z'),
    });
  });

  it.each([
    ['not an object', 'garbage'],
    ['a missing id', { ...validPayload, id: undefined }],
    ['no areas', { ...validPayload, areas: [] }],
    ['areas that are not a list', { ...validPayload, areas: 'TI' }],
    ['an invalid deadline', { ...validPayload, deadline: 'tomorrow' }],
    ['a negative salary', { ...validPayload, salary: -1 }],
    ['a salary that is not a number', { ...validPayload, salary: 'a lot' }],
  ])(
    'dead-letters a malformed payload (%s) immediately, without retrying',
    async (_label, payload) => {
      const context = contextFor();

      await consumer.handleNewVacancy(payload, context);

      expect(execute).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
      expect(nack).toHaveBeenCalledWith(context.getMessage(), false, false);
      expect(ack).not.toHaveBeenCalled();
    },
  );

  describe('when processing fails', () => {
    beforeEach(() => execute.mockRejectedValue(new Error('db down')));

    it('schedules the first retry on the 2s retry queue and releases the message', async () => {
      const context = contextFor();

      await consumer.handleNewVacancy(validPayload, context);

      expect(publish).toHaveBeenCalledWith(
        '',
        'concursos.new.retry.2s',
        content,
        expect.objectContaining({
          persistent: true,
          headers: expect.objectContaining({ 'x-attempt': 2 }),
        }),
      );
      // Acknowledged only after the retry copy was published: nothing is lost.
      expect(ack).toHaveBeenCalledWith(context.getMessage());
      expect(publish.mock.invocationCallOrder[0]).toBeLessThan(
        ack.mock.invocationCallOrder[0] ?? Infinity,
      );
      expect(nack).not.toHaveBeenCalled();
    });

    it('uses the 4s retry queue for the second retry', async () => {
      await consumer.handleNewVacancy(
        validPayload,
        contextFor({ 'x-attempt': 2 }),
      );

      expect(publish).toHaveBeenCalledWith(
        '',
        'concursos.new.retry.4s',
        content,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-attempt': 3 }),
        }),
      );
    });

    it('dead-letters the message on the third failed attempt', async () => {
      const context = contextFor({ 'x-attempt': 3 });

      await consumer.handleNewVacancy(validPayload, context);

      expect(publish).not.toHaveBeenCalled();
      expect(nack).toHaveBeenCalledWith(context.getMessage(), false, false);
      expect(ack).not.toHaveBeenCalled();
    });

    it('keeps other headers when scheduling a retry', async () => {
      await consumer.handleNewVacancy(
        validPayload,
        contextFor({ 'x-trace': 'abc' }),
      );

      expect(publish).toHaveBeenCalledWith(
        '',
        expect.any(String),
        content,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-trace': 'abc' }),
        }),
      );
    });
  });

  it('does not block while waiting to retry (no in-process sleep)', async () => {
    execute.mockRejectedValue(new Error('db down'));
    const started = Date.now();

    await consumer.handleNewVacancy(validPayload, contextFor());

    expect(Date.now() - started).toBeLessThan(500);
  });
});
