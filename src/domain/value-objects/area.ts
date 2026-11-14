/** Job areas a subscriber can follow. QUALQUER matches vacancies of every area. */
export const AREAS = [
  'TI',
  'SAUDE',
  'EDUCACAO',
  'TRIBUNAIS',
  'POLICIAL',
  'QUALQUER',
] as const;

export type Area = (typeof AREAS)[number];

export const isArea = (value: string): value is Area =>
  (AREAS as readonly string[]).includes(value);
