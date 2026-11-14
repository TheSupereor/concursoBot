import { Salary } from './salary';

export class Preference {
  constructor(
    public readonly area: string, // TI, Tribunais, Saúde...
    public readonly region: string, // SP, BR ...
    public minimunSalary: Salary,
  ) {
    if (!area || !region) {
      throw new Error(
        'Área e Região são obrigatórios para criar uma preferência',
      );
    }
  }
}
