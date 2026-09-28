import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'authorization:public';

/**
 * Opts a route out of authentication and authorization.
 *
 * Authentication is enforced globally and fails closed, so this decorator is
 * the only way to expose an unauthenticated endpoint and it must be applied
 * deliberately. Its use is asserted in `public-routes.spec.ts`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
