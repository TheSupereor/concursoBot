import { InvalidPreferenceError } from '../errors/domain.error';
import { Area, isArea } from './area';
import { isRegion, Region } from './region';
import { Salary } from './salary';

/** What a subscriber wants to be alerted about. Immutable: changes produce a new instance. */
export class Preference {
  readonly area: Area;
  readonly region: Region;

  constructor(
    area: string,
    region: string,
    readonly minimumSalary: Salary,
  ) {
    if (!isArea(area)) {
      throw new InvalidPreferenceError(`unknown area "${area}"`);
    }
    if (!isRegion(region)) {
      throw new InvalidPreferenceError(`unknown region "${region}"`);
    }
    this.area = area;
    this.region = region;
  }

  withMinimumSalary(minimumSalary: Salary): Preference {
    return new Preference(this.area, this.region, minimumSalary);
  }

  hasSameTargetAs(other: Preference): boolean {
    return this.area === other.area && this.region === other.region;
  }
}
