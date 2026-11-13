import { getMetadataArgsStorage } from 'typeorm';
import { NotificationLogOrmEntity } from './NotificationLogOrmEntity';

describe('NotificationLogOrmEntity schema', () => {
  it('only declares unique constraints over columns that exist', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((column) => column.target === NotificationLogOrmEntity)
      .map((column) => column.propertyName);
    const uniques = storage.uniques.filter(
      (unique) => unique.target === NotificationLogOrmEntity,
    );

    expect(uniques.length).toBeGreaterThan(0);
    for (const unique of uniques) {
      for (const column of unique.columns as string[]) {
        expect(columns).toContain(column);
      }
    }
  });

  it('enforces one log per subscriber and vacancy', () => {
    const unique = getMetadataArgsStorage().uniques.find(
      (candidate) => candidate.target === NotificationLogOrmEntity,
    );

    expect(unique?.columns).toEqual(['telegramId', 'vacancyId']);
  });
});
