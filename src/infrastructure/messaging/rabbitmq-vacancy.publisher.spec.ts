import { ClientProxy } from '@nestjs/microservices';
import { EMPTY, throwError } from 'rxjs';
import { Salary } from '../../domain/value-objects/salary';
import { Vacancy } from '../../domain/entities/vacancy';
import { RabbitMqVacancyPublisher } from './rabbitmq-vacancy.publisher';

describe('RabbitMqVacancyPublisher', () => {
  const vacancy = new Vacancy(
    'abc123',
    'Analista de Sistemas',
    ['TI', 'EDUCACAO'],
    'SP',
    new Salary(8971.98),
    {
      url: 'https://example.test/edital',
      organization: 'Prefeitura de Exemplo',
      deadline: new Date('2026-12-14T00:00:00.000Z'),
    },
  );

  const clientWith = (emit: jest.Mock) => ({ emit }) as unknown as ClientProxy;

  it('emits the vacancy on the vacancy event with every field the consumer needs', async () => {
    const emit = jest.fn().mockReturnValue(EMPTY);

    await new RabbitMqVacancyPublisher(clientWith(emit)).publish(vacancy);

    expect(emit).toHaveBeenCalledWith('concursos.new', {
      id: 'abc123',
      job: 'Analista de Sistemas',
      areas: ['TI', 'EDUCACAO'],
      region: 'SP',
      salary: 8971.98,
      url: 'https://example.test/edital',
      organization: 'Prefeitura de Exemplo',
      deadline: '2026-12-14',
    });
  });

  it('leaves out the details a vacancy does not have', async () => {
    const emit = jest.fn().mockReturnValue(EMPTY);

    await new RabbitMqVacancyPublisher(clientWith(emit)).publish(
      new Vacancy('bare', 'Role', 'OUTROS', 'MG', new Salary(0)),
    );

    const [, message] = emit.mock.calls[0] as [string, Record<string, unknown>];
    expect(message).toEqual({
      id: 'bare',
      job: 'Role',
      areas: ['OUTROS'],
      region: 'MG',
      salary: 0,
      url: undefined,
      organization: undefined,
      deadline: undefined,
    });
  });

  it('surfaces a broker failure to the caller, so the vacancy is not recorded as published', async () => {
    const emit = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('connection refused')));

    await expect(
      new RabbitMqVacancyPublisher(clientWith(emit)).publish(vacancy),
    ).rejects.toThrow('connection refused');
  });

  it('produces a message the consumer accepts', () => {
    // The consumer validates the payload; this keeps the two sides in agreement.
    const emit = jest.fn().mockReturnValue(EMPTY);
    void new RabbitMqVacancyPublisher(clientWith(emit)).publish(vacancy);

    const [, message] = emit.mock.calls[0] as [string, { areas: unknown }];
    expect(Array.isArray(message.areas)).toBe(true);
  });
});
