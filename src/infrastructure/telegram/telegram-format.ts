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

/** Same as escapeHtml, plus the quote that would end an HTML attribute. */
const escapeAttribute = (text: string): string =>
  escapeHtml(text).replace(/"/g, '&quot;');

/** Returns the address only when it is a plain web link; anything else is not worth linking. */
function safeWebUrl(address: string | undefined): string | null {
  if (!address) return null;
  try {
    const url = new URL(address);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const formatMoney = (value: number): string =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Day/month/year of a date that represents a calendar day (stored as UTC midnight). */
const formatDay = (date: Date): string =>
  [
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    date.getUTCFullYear(),
  ].join('/');

/** HTML message for a new vacancy. Every dynamic value is escaped. */
export function formatVacancyAlert(vacancy: Vacancy): string {
  const { organization, deadline, url } = vacancy.details;
  const link = safeWebUrl(url);
  // A salary of zero means the listing did not state one.
  const salary =
    vacancy.salary.value > 0
      ? `até R$ ${formatMoney(vacancy.salary.value)}`
      : 'não informado';

  return [
    '🚨 <b>Novo concurso encontrado!</b> 🚨',
    '',
    organization ? `<b>Órgão:</b> ${escapeHtml(organization)}` : null,
    `<b>Cargo:</b> ${escapeHtml(vacancy.job)}`,
    `<b>Áreas:</b> ${escapeHtml(vacancy.areas.join(', '))}`,
    `<b>Região:</b> ${escapeHtml(vacancy.region)}`,
    `<b>Salário:</b> ${salary}`,
    deadline ? `<b>Inscrições até:</b> ${formatDay(deadline)}` : null,
    '',
    link ? `<a href="${escapeAttribute(link)}">Ver edital</a>` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
