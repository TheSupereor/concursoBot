import {
  DuplicatePreferenceError,
  InvalidPreferenceError,
  NoPreferencesError,
  PreferenceLimitReachedError,
} from '../../domain/errors/domain.error';
import { SubscriberNotFoundError } from '../../application/errors/subscriber-not-found.error';
import { userMessageFor } from './user-messages';

describe('userMessageFor', () => {
  it.each([
    [new SubscriberNotFoundError('1'), '/start'],
    [new PreferenceLimitReachedError(5), 'limite'],
    [new DuplicatePreferenceError('TI', 'SP'), 'já'],
    [new NoPreferencesError(), 'pelo menos uma área'],
  ])('translates %p for the user', (error, fragment) => {
    expect(userMessageFor(error)).toContain(fragment);
  });

  it('never leaks internal error text for unexpected errors', () => {
    const message = userMessageFor(new Error('ECONNREFUSED 10.0.0.5:3306'));

    expect(message).not.toContain('ECONNREFUSED');
    expect(message.length).toBeGreaterThan(0);
  });

  it('gives a generic answer for invalid input', () => {
    expect(
      userMessageFor(new InvalidPreferenceError('unknown area')),
    ).toContain('inválida');
  });
});
