import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoverRoutes } from './support/route-registry';

function documentedRoutes(markdown: string) {
  const routes = new Set<string>();
  const row = /^\|\s*(GET|POST|PUT|PATCH|DELETE)(?:\/(GET|POST|PUT|PATCH|DELETE))?\s*\|\s*`([^`]+)`\s*\|/gm;
  for (const match of markdown.matchAll(row)) {
    routes.add(`${match[1]} ${match[3]}`);
    if (match[2]) routes.add(`${match[2]} ${match[3]}`);
  }
  return [...routes].sort();
}

describe('active API documentation', () => {
  it('lists every active controller route and no inactive route', () => {
    const markdown = readFileSync(resolve(__dirname, '../../../docs/api.md'), 'utf8');
    const documented = documentedRoutes(markdown);
    const active = discoverRoutes().map(
      (route) => `${route.method.toUpperCase()} ${route.path.replace('/api/v1', '')}`,
    );

    expect(documented).toEqual(active.sort());
  });
});
