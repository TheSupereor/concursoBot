import { FactoryProvider } from '@nestjs/common';
import { provideUseCase } from './provide-use-case';

class Greeter {
  constructor(
    readonly greeting: string,
    readonly name: string,
  ) {}
}

describe('provideUseCase', () => {
  const provider = provideUseCase(Greeter, [
    'GREETING',
    'NAME',
  ]) as FactoryProvider;

  it('registers the use case under its own class', () => {
    expect(provider.provide).toBe(Greeter);
  });

  it('asks Nest for the listed tokens, in order', () => {
    expect(provider.inject).toEqual(['GREETING', 'NAME']);
  });

  it('builds the use case with the injected dependencies in that order', () => {
    const instance = provider.useFactory('Hello', 'Ana') as Greeter;

    expect(instance).toBeInstanceOf(Greeter);
    expect(instance.greeting).toBe('Hello');
    expect(instance.name).toBe('Ana');
  });
});
