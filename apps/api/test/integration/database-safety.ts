export function requireIsolatedTestDatabase(value = process.env.TEST_DATABASE_URL): string {
  if (!value) throw new Error('TEST_DATABASE_URL is required for integration tests.');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid MySQL URL.');
  }
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (parsed.protocol !== 'mysql:' || !database.endsWith('_test')) {
    throw new Error(`Refusing to reset database "${database || '(missing)'}". Integration database names must end in _test.`);
  }
  return value;
}
