import { AREAS } from '../../domain/value-objects/area';
import { REGIONS } from '../../domain/value-objects/region';
import { SALARY_OPTIONS, callbackData, callbackPattern } from './callback-data';

describe('Telegram button callback data', () => {
  describe('builders and patterns agree, for every valid value', () => {
    it.each(AREAS)('add area %s', (area) => {
      const match = callbackPattern.addArea.exec(callbackData.addArea(area));

      expect(match?.[1]).toBe(area);
    });

    it('pick region, for every area and region', () => {
      for (const area of AREAS) {
        for (const region of REGIONS) {
          const match = callbackPattern.pickRegion.exec(
            callbackData.pickRegion(area, region),
          );
          expect(match?.slice(1)).toEqual([area, region]);
        }
      }
    });

    it('remove preference, for every area and region', () => {
      for (const area of AREAS) {
        for (const region of REGIONS) {
          const match = callbackPattern.removePreference.exec(
            callbackData.removePreference(area, region),
          );
          expect(match?.slice(1)).toEqual([area, region]);
        }
      }
    });

    it.each(SALARY_OPTIONS)('set salary %p', (value) => {
      const match = callbackPattern.setSalary.exec(
        callbackData.setSalary(value),
      );

      expect(match?.[1]).toBe(String(value));
    });
  });

  describe('rejects data that no button of ours could have produced', () => {
    it.each([
      'add_area_ASTRONAUTA',
      'add_area_TI; DROP TABLE subscribers',
      'xadd_area_TI',
      'add_area_TI_extra',
      'add_area_',
      '',
    ])('add area: %p', (data) => {
      expect(callbackPattern.addArea.test(data)).toBe(false);
    });

    it.each([
      'pick_region:TI:XX',
      'pick_region:ASTRONAUTA:SP',
      'pick_region:TI',
      'pick_region:TI:SP:extra',
      'pick_region:TI:SPx',
    ])('pick region: %p', (data) => {
      expect(callbackPattern.pickRegion.test(data)).toBe(false);
    });

    it.each([
      'del_pref:TI:XX',
      'del_pref:TI',
      'del_area_TI',
      'del_pref:TI:SP;',
    ])('remove preference: %p', (data) => {
      expect(callbackPattern.removePreference.test(data)).toBe(false);
    });

    it.each([
      'set_salario_1',
      'set_salario_999999',
      'set_salario_-5',
      'set_salario_3000abc',
      'xset_salario_3000',
      'set_salario_',
    ])('set salary: %p (only the offered amounts are valid)', (data) => {
      expect(callbackPattern.setSalary.test(data)).toBe(false);
    });
  });

  it('keeps every callback within Telegram’s 64 byte limit', () => {
    const longest = Math.max(
      ...AREAS.flatMap((area) =>
        REGIONS.map((region) =>
          Buffer.byteLength(callbackData.pickRegion(area, region)),
        ),
      ),
    );

    expect(longest).toBeLessThanOrEqual(64);
  });
});
