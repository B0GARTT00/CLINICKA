import { OpenAPIObject } from '@nestjs/swagger';
import { ACCESS_TOKEN_SCHEME, isPublicRoute } from '../../auth/constants/api-security';

type OperationObject = {
  responses?: Record<string, unknown>;
  security?: unknown[];
};

type PathOperations = Record<string, OperationObject | undefined>;

const UNAUTHORIZED_RESPONSE = {
  description: 'Authentication required: the access token is missing, invalid, or expired.',
};

const FORBIDDEN_RESPONSE = {
  description: "Authenticated, but the caller's roles and permissions do not allow this action.",
};

function applyOperationSecurity(operations: PathOperations, path: string) {
  for (const [method, operation] of Object.entries(operations)) {
    // A path item may carry `parameters` or `summary` alongside the HTTP-method
    // operations; only the latter describe a callable endpoint.
    if (!operation || !('responses' in operation)) continue;
    if (isPublicRoute(method, path)) continue;

    operation.security = [{ [ACCESS_TOKEN_SCHEME]: [] }];
    operation.responses ??= {};
    operation.responses['401'] ??= { ...UNAUTHORIZED_RESPONSE };
    operation.responses['403'] ??= { ...FORBIDDEN_RESPONSE };
  }
}

/**
 * Applies the API's authorization policy to the generated OpenAPI document.
 *
 * Every protected operation is marked with the bearer scheme it actually
 * requires and is documented as returning `401` and `403`, so the contract
 * described to API consumers is the contract the guards enforce. Per-route
 * `@ApiResponse` declarations still take precedence over these defaults.
 */
export function applyAuthorizationToDocument(document: OpenAPIObject): OpenAPIObject {
  for (const [path, operations] of Object.entries(document.paths ?? {})) {
    if (operations) applyOperationSecurity(operations as unknown as PathOperations, path);
  }
  return document;
}
