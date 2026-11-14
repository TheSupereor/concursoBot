import { Salary } from '../value-objects/salary';

export class Vacancy {
  constructor(
    public readonly id: string,
    public readonly job: string,
    public readonly area: string,
    public readonly region: string,
    public readonly salary: Salary,
  ) {}
}
