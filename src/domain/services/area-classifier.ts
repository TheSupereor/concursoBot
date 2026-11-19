import { Area } from '../value-objects/area';

/** Area of a vacancy that matches no known area; only QUALQUER subscribers receive it. */
export const OTHER_AREA = 'OUTROS';

export type ClassifiedArea = Exclude<Area, 'QUALQUER'> | typeof OTHER_AREA;

export interface ClassifiableVacancy {
  /** Headline of the listing. */
  title: string;
  /** Roles offered, for example "Professor Substituto" or "Vários Cargos". */
  roles: string;
  /** Hiring organization. */
  organization: string;
}

/**
 * Keywords per area, written without accents and in lower case (the text is normalized the
 * same way). Each one is a whole-word regular expression: matching raw substrings is what made
 * the first classifier tag almost every vacancy as IT, because "ti" is inside countless words.
 *
 * The order is also the tie-break order.
 */
const KEYWORDS: readonly (readonly [
  Exclude<ClassifiedArea, 'OUTROS'>,
  RegExp[],
])[] = [
  [
    'POLICIAL',
    [
      /\bpolic/,
      /\bguarda (civil|municipal)\b/,
      /\bbombeiro/,
      /\bdelegado/,
      /\bagente penitenciario/,
      /\bagente de seguranca/,
      /\bperito criminal/,
      /\bgcm\b/,
    ],
  ],
  [
    'TRIBUNAIS',
    [
      /\btribunal\b/,
      /\btribunais\b/,
      /\bjudiciari/,
      /\boficial de justica\b/,
      /\bministerio publico\b/,
      /\bdefensoria/,
      /\bjuiz/,
      /\bpromotor/,
      /\bprocurador/,
      /\b(trt|trf|tre|tj)\b/,
      /\bcartorio/,
    ],
  ],
  [
    'SAUDE',
    [
      /\bmedic[oa]s?\b/,
      /\bmedicina\b/,
      /\benfermeir/,
      /\benfermagem\b/,
      /\bdentista/,
      /\bodontolog/,
      /\bfarmaceutic/,
      /\bfarmacia\b/,
      /\bfisioterap/,
      /\bpsicolog/,
      /\bnutricionist/,
      /\bfonoaudiolog/,
      /\bbiomedic/,
      /\bsaude\b/,
      /\bhospital/,
      /\bsamu\b/,
      /\bterapeuta ocupacional\b/,
    ],
  ],
  [
    'TI',
    [
      /\btecnologia da informacao\b/,
      /\binformatica\b/,
      /\banalista de sistemas\b/,
      /\bdesenvolvedor/,
      /\bprogramador/,
      /\bredes de computadores\b/,
      /\bbanco de dados\b/,
      /\bseguranca da informacao\b/,
      /\bsistemas de informacao\b/,
      /\bti\b/,
    ],
  ],
  [
    'EDUCACAO',
    [
      /\bprofessor/,
      /\bdocente/,
      /\bpedagog/,
      /\beducacao\b/,
      /\bescola/,
      /\bmagisterio\b/,
      /\borientador educacional\b/,
      /\beducador/,
      /\bcoordenador pedagogico\b/,
    ],
  ],
];

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Areas with at least one keyword in the text, with how many distinct keywords matched. */
const scores = (
  text: string,
): { area: Exclude<ClassifiedArea, 'OUTROS'>; score: number }[] =>
  KEYWORDS.map(([area, patterns]) => ({
    area,
    score: patterns.filter((pattern) => pattern.test(text)).length,
  })).filter(({ score }) => score > 0);

/**
 * Classifies a vacancy into the areas subscribers can follow. A vacancy can belong to several
 * (a city hall hiring a teacher and an IT analyst), so every area with evidence is returned,
 * strongest first and in a fixed order on ties.
 *
 * The roles and the headline decide. The organization (for example "Secretaria de Saúde") is
 * consulted only when they say nothing, so a health department hiring a driver is not
 * advertised as a health job. OUTROS means nothing matched and is never mixed with an area.
 */
export function classifyAreas(vacancy: ClassifiableVacancy): ClassifiedArea[] {
  const fromRole = scores(normalize(`${vacancy.title} ${vacancy.roles}`));
  const evidence =
    fromRole.length > 0 ? fromRole : scores(normalize(vacancy.organization));

  if (evidence.length === 0) return [OTHER_AREA];

  // Array.prototype.sort is stable, so ties keep the order of KEYWORDS.
  return evidence.sort((a, b) => b.score - a.score).map(({ area }) => area);
}
