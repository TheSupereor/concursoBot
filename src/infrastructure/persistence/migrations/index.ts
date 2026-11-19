import { InitialSchema1795121871463 } from './1795121871463-InitialSchema';
import { AddMatchingIndexes1795122166023 } from './1795122166023-AddMatchingIndexes';
import { AddVacancies1795130349218 } from './1795130349218-AddVacancies';

/**
 * Every migration, in order. Listed explicitly (instead of a glob) so the same list works
 * when running from TypeScript sources and from the compiled output.
 */
export const migrations = [
  InitialSchema1795121871463,
  AddMatchingIndexes1795122166023,
  AddVacancies1795130349218,
];
