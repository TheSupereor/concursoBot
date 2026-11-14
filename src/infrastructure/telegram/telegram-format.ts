import { Vacancy } from '../../domain/entities/vacancy';

/**
 * Escapes text for Telegram's HTML parse mode, where only &, < and > are special.
 * Vacancy fields come from scraped pages and must never be interpreted as markup.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** HTML message for a new vacancy. Every dynamic value is escaped. */
export function formatVacancyAlert(vacancy: Vacancy): string {
  return [
    '🚨 <b>Novo Edital Encontrado!</b> 🚨',
    '',
    `<b>Cargo:</b> ${escapeHtml(vacancy.job)}`,
    `<b>Área:</b> ${escapeHtml(vacancy.area)}`,
    `<b>Região:</b> ${escapeHtml(vacancy.region)}`,
    `<b>Salário:</b> R$ ${vacancy.salary.value.toFixed(2)}`,
    '',
    'Acesse o portal para mais detalhes.',
  ].join('\n');
}
