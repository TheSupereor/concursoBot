import { z } from 'zod';
import { ScrapedVacancy } from '../../application/ports/vacancy-source.port';
import { REGIONS } from '../../domain/value-objects/region';
import { parseDeadline } from './pci-concursos.parser';

const DEFAULT_SITE_URL = 'https://www.cebraspe.org.br';

/**
 * The fields this adapter relies on. The API is undocumented, so anything else it sends is
 * ignored, and a response without these fields is a format change that must fail loudly.
 */
const eventSummarySchema = z.object({
  eventoNomeAbreviado: z.string().min(1),
  eventoURL: z.string().regex(/^[\w-]+$/),
  eventoTotalVagas: z.union([z.string(), z.number()]).nullable(),
  eventoSalarioMaximo: z.number().nullable(),
});

const phaseSchema = z.array(
  z.object({ faseEvento: z.string(), eventos: z.array(eventSummarySchema) }),
);

const eventDetailSchema = z.object({
  periodoInscricao: z.string().nullable(),
  eventoCargos: z.array(z.object({ area: z.string() })).nullable(),
});

export type CebraspeEventSummary = z.infer<typeof eventSummarySchema>;
export type CebraspeEventDetail = z.infer<typeof eventDetailSchema>;

/** The API answered, but not in the shape this adapter understands: it has changed. */
export class CebraspeFormatError extends Error {
  constructor(what: string, error: z.ZodError) {
    const issue = error.issues[0];
    super(
      `Cebraspe ${what} have an unexpected format${issue ? ` at ${issue.path.join('.') || 'root'}: ${issue.message}` : ''}`,
    );
    this.name = 'CebraspeFormatError';
  }
}

/** Competitions listed in one phase ("novos", "inscricoes-abertas"). */
export function parseCebraspePhase(body: unknown): CebraspeEventSummary[] {
  const result = phaseSchema.safeParse(body);
  if (!result.success) {
    throw new CebraspeFormatError('phase listings', result.error);
  }
  return result.data.flatMap((group) => group.eventos);
}

/** Details of one competition. */
export function parseCebraspeEvent(body: unknown): CebraspeEventDetail {
  const result = eventDetailSchema.safeParse(body);
  if (!result.success) {
    throw new CebraspeFormatError('competition details', result.error);
  }
  return result.data;
}

const STATES = new Set<string>(REGIONS.filter((region) => region !== 'BR'));

/**
 * Federative unit named in a short name such as "PC PE 26" or "SEFAZ/RJ 25 AUDITOR". Without one
 * the competition is treated as national (federal bodies such as "TCU 25 AUFC"). A state body
 * whose name carries no state ends up national too, which only reaches subscribers who follow
 * every region.
 */
export function regionFromName(name: string): string {
  // Accents are removed first, so "SAÚDE" stays one word instead of yielding "SA" and "DE".
  const state = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .find((token) => STATES.has(token));
  return state ?? 'BR';
}

/** "PC PE 26" → "PC PE": the short name without the trailing year. */
export function organizationFromName(name: string): string {
  return name
    .replace(/\s+(?:19|20)?\d{2}\b.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Cargo 1: Agente de Polícia" → "Agente de Polícia". */
const roleName = (area: string): string =>
  area.replace(/^\s*cargo\s*\d*\s*[:–-]\s*/i, '').trim();

function parseOpenings(value: string | number | null): number | null {
  if (value === null) return null;
  const openings = Number(String(value).replace(/\./g, ''));
  return Number.isInteger(openings) && openings > 0 ? openings : null;
}

/**
 * One competition as a scraped vacancy. Cebraspe lists a competition, not each role, so the
 * roles are joined; the details are optional, because a competition whose details cannot be
 * read is still worth announcing.
 */
export function toScrapedVacancy(
  summary: CebraspeEventSummary,
  detail: CebraspeEventDetail | null,
  siteUrl: string = DEFAULT_SITE_URL,
): ScrapedVacancy {
  const roles = (detail?.eventoCargos ?? [])
    .map((cargo) => roleName(cargo.area))
    .filter((role) => role.length > 0);

  return {
    url: `${siteUrl}/concursos/${summary.eventoURL}`,
    title: summary.eventoNomeAbreviado,
    organization: organizationFromName(summary.eventoNomeAbreviado),
    region: regionFromName(summary.eventoNomeAbreviado),
    roles: roles.join(', '),
    education: [],
    openings: parseOpenings(summary.eventoTotalVagas),
    reserveList: false,
    salaryMax:
      summary.eventoSalarioMaximo !== null && summary.eventoSalarioMaximo > 0
        ? summary.eventoSalarioMaximo
        : null,
    deadline: detail?.periodoInscricao
      ? parseDeadline(detail.periodoInscricao)
      : null,
    status: 'open',
  };
}
