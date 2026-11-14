import { Provider } from '@nestjs/common';

type UseCaseClass<TUseCase, TDeps extends unknown[]> = new (
  ...deps: TDeps
) => TUseCase;

/**
 * Registers a framework-free use case with Nest. Use cases stay plain classes (no decorators),
 * so the application layer does not depend on NestJS; this factory is the only coupling.
 */
export function provideUseCase<TUseCase, TDeps extends unknown[]>(
  useCase: UseCaseClass<TUseCase, TDeps>,
  inject: string[],
): Provider {
  return {
    provide: useCase,
    inject,
    useFactory: (...deps: unknown[]) => new useCase(...(deps as TDeps)),
  };
}
