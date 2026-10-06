/**
 * Name of the OpenAPI bearer security scheme. Every protected operation
 * declares `@ApiBearerAuth(ACCESS_TOKEN_SCHEME)` so the Swagger UI can
 * authenticate with it; a bare `@ApiBearerAuth()` would reference an undefined
 * scheme and render the operation as unprotected.
 */
export const ACCESS_TOKEN_SCHEME = 'access-token';

/**
 * The complete set of routes that are reachable without authentication.
 *
 * Authentication is enforced globally, so this list is the exact inverse of
 * `@Public()`. It is kept here so the generated OpenAPI document can describe
 * these operations as public, and `public-routes.spec.ts` asserts that the
 * list still matches where `@Public()` is actually applied.
 */
export const PUBLIC_ROUTES = [
  { method: 'get', path: '/api/v1/health' },
  { method: 'post', path: '/api/v1/auth/login' },
  { method: 'post', path: '/api/v1/auth/signup' },
  { method: 'get', path: '/api/v1/auth/academic-catalog' },
  { method: 'get', path: '/api/v1/auth/verify-email' },
  { method: 'post', path: '/api/v1/auth/resend-verification' },
  { method: 'post', path: '/api/v1/auth/password-reset/request' },
  { method: 'post', path: '/api/v1/auth/password-reset/complete' },
  { method: 'post', path: '/api/v1/auth/refresh' },
] as const;

export function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some((route) => route.method === method.toLowerCase() && route.path === path);
}
