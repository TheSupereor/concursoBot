import { DomainError } from '../../domain/errors/domain.error';

const MESSAGES: Record<string, string> = {
  SUBSCRIBER_NOT_FOUND:
    'Você ainda não está cadastrado. Digite /start primeiro.',
  PREFERENCE_LIMIT_REACHED:
    'Você atingiu o limite de 5 áreas. Remova uma antes de adicionar outra.',
  DUPLICATE_PREFERENCE: 'Você já monitora essa área nessa região.',
  NO_PREFERENCES:
    'Você precisa adicionar pelo menos uma área antes de definir o salário.',
  INVALID_PREFERENCE: 'Opção inválida.',
  INVALID_SALARY: 'Valor de salário inválido.',
};

const GENERIC_MESSAGE = 'Ops, algo deu errado. Tente novamente em instantes.';

/**
 * Translates an error into text that is safe to show to a Telegram user. Business errors map
 * by code; anything else gets a generic message so internals are never exposed.
 * (Strings live here until the bot gets proper i18n.)
 */
export function userMessageFor(error: unknown): string {
  if (error instanceof DomainError) {
    return MESSAGES[error.code] ?? GENERIC_MESSAGE;
  }
  return GENERIC_MESSAGE;
}
