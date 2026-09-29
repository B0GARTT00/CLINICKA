import { requireIsolatedTestDatabase } from './database-safety';

describe('integration database safety', () => {
  it('accepts only MySQL database names ending in _test', () => {
    expect(requireIsolatedTestDatabase('mysql://root:pw@localhost:3306/clinicka_test')).toContain('clinicka_test');
  });

  it.each([
    'mysql://root:pw@localhost:3306/clinicka',
    'postgresql://root:pw@localhost:5432/clinicka_test',
    'not-a-url',
  ])('refuses unsafe database target %s', (url) => {
    expect(() => requireIsolatedTestDatabase(url)).toThrow();
  });
});
