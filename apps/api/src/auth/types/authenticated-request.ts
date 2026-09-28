/**
 * The authenticated caller as seen by a controller handler.
 *
 * This is the narrowest useful view of the request: the `JwtAuthGuard` guarantees
 * `user` is populated from a verified token, and handlers only need the caller
 * identity plus the addressing details the audit trail records. Express's `Request`
 * is deliberately not intersected in here, so that a handler's actual data needs
 * are visible in its signature and can be satisfied directly in unit tests.
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles?: string[];
  patientId?: string | null;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  ip?: string;
  get?: (name: string) => string | undefined;
}
