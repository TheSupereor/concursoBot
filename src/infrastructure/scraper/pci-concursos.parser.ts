import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { ScrapedVacancy } from '../../application/ports/vacancy-source.port';

const DEFAULT_BASE_URL = 'https://www.pciconcursos.com.br';

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Reads a Brazilian money amount such as "R$ 8.971,98". */
export function parseMoney(text: string): number | null {
  const match = /(\d{1,3}(?:\.\d{3})*),(\d{2})/.exec(text);
  if (!match?.[1] || !match[2]) return null;
  return Number(`${match[1].replace(/\./g, '')}.${match[2]}`);
}

/**
 * Last day to register. Listings show a single date ("14/12/2026"), an extension
 * ("Prorrogado até23/11/2026") or a period ("20/11 a21/12/2026", "09 a14/01/2027"); in every
 * case the last full date is the deadline. Impossible dates are rejected, not rolled over.
 */
export function parseDeadline(text: string): Date | null {
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g);
  const last = dates?.[dates.length - 1];
  if (!last) return null;

  const [day, month, year] = last.split('/').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isReal ? date : null;
}

/** Number of openings, when the listing states one ("107 vagas", "1.250 vagas", "1 vaga"). */
export function parseOpenings(text: string): number | null {
  const match = /(\d{1,3}(?:\.\d{3})*)\s+vagas?\b/i.exec(text);
  return match?.[1] ? Number(match[1].replace(/\./g, '')) : null;
}

/**
 * Highest monthly salary in the text. Amounts quoted per hour (teaching hours) are ignored:
 * they cannot be compared with a monthly minimum.
 */
function parseMonthlySalary(text: string): number | null {
  const amounts = [
    ...text.matchAll(
      /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})(\s*por\s+hora(?:-aula)?)?/gi,
    ),
  ]
    .filter((match) => !match[2])
    .map((match) => parseMoney(match[1] ?? ''))
    .filter((amount): amount is number => amount !== null);

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

/** Text of an element without the text of its child elements. */
const ownText = (element: cheerio.Cheerio<Element>): string =>
  squash(element.clone().children().remove().end().text());

/**
 * Parses a PCI Concursos listing page (".ca" blocks inside the regional listings). The
 * markup is not an API and changes without notice, so this is covered by fixtures and a
 * scheduled check against the live site. A block that cannot be understood is skipped
 * rather than failing the whole page.
 */
export function parsePciListing(
  html: string,
  baseUrl: string = DEFAULT_BASE_URL,
): ScrapedVacancy[] {
  const $ = cheerio.load(html);
  const vacancies: ScrapedVacancy[] = [];

  $('.ca').each((_, node) => {
    const block = $(node);
    const link = block.find('a[href]').first();
    const href = link.attr('href');
    const region = squash(block.find('.cc').first().text());
    const organization = squash(link.text());
    const title = squash(link.attr('title') ?? organization);
    if (!href || !region || !title) return;

    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    const details = block.find('.cd').first();
    const summary = ownText(details);
    const roleSpan = details.children('span').first();
    const deadlineText = squash(block.find('.ce').first().text());

    vacancies.push({
      url,
      title,
      organization,
      region,
      roles: ownText(roleSpan),
      education: roleSpan
        .find('span')
        .first()
        .text()
        .split('/')
        .map(squash)
        .filter(Boolean),
      openings: parseOpenings(summary),
      reserveList: /cadastro\s+(de\s+)?reserva|\bcr\b/i.test(summary),
      salaryMax: parseMonthlySalary(summary),
      deadline: parseDeadline(deadlineText),
      status: /cancelad/i.test(deadlineText) ? 'cancelled' : 'open',
    });
  });

  return vacancies;
}
