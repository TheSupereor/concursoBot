import { AREAS } from '../../domain/value-objects/area';
import { REGIONS } from '../../domain/value-objects/region';

/** Minimum salaries offered by the /salario buttons; only these values are accepted back. */
export const SALARY_OPTIONS = [0, 3000, 5000, 10000, 15000] as const;

const anyOf = (values: readonly (string | number)[]): string =>
  values.join('|');

/**
 * What each inline button sends back to the bot. Telegram limits it to 64 bytes and the client
 * is not trusted, so the bot only accepts exactly what these builders can produce.
 */
export const callbackData = {
  addArea: (area: string): string => `add_area_${area}`,
  pickRegion: (area: string, region: string): string =>
    `pick_region:${area}:${region}`,
  removePreference: (area: string, region: string): string =>
    `del_pref:${area}:${region}`,
  setSalary: (value: number): string => `set_salario_${value}`,
} as const;

/**
 * The patterns the bot listens for. They are anchored and built from the same lists as the
 * buttons, so a value that no button could have produced never reaches a handler.
 */
export const callbackPattern = {
  addArea: new RegExp(`^add_area_(${anyOf(AREAS)})$`),
  pickRegion: new RegExp(`^pick_region:(${anyOf(AREAS)}):(${anyOf(REGIONS)})$`),
  removePreference: new RegExp(
    `^del_pref:(${anyOf(AREAS)}):(${anyOf(REGIONS)})$`,
  ),
  setSalary: new RegExp(`^set_salario_(${anyOf(SALARY_OPTIONS)})$`),
} as const;
