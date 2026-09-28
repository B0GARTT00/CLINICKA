import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../src/auth/constants/permissions';
import { UserRole } from '../../src/auth/constants/roles';
import { PERMISSIONS_KEY } from '../../src/auth/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../src/auth/decorators/public.decorator';
import { ROLES_KEY } from '../../src/auth/decorators/roles.decorator';
import { AcademicController } from '../../src/academic/academic.controller';
import { AppointmentsController } from '../../src/appointments/appointments.controller';
import { AuditController } from '../../src/audit/audit.controller';
import { AuthController } from '../../src/auth/auth.controller';
import { CertificatesController } from '../../src/certificates/certificates.controller';
import { ClearancesController } from '../../src/clearances/clearances.controller';
import { CommunicationsController } from '../../src/communications/communications.controller';
import { DispensingController } from '../../src/dispensing/dispensing.controller';
import { DocumentsController } from '../../src/documents/documents.controller';
import { EmergenciesController } from '../../src/emergencies/emergencies.controller';
import { EvidenceController } from '../../src/evidence/evidence.controller';
import { HealthController } from '../../src/health/health.controller';
import { InventoryController } from '../../src/inventory/inventory.controller';
import { PatientsController } from '../../src/modules/patients/patients.controller';
import { UsersController } from '../../src/modules/users/users.controller';
import { ReportsController } from '../../src/reports/reports.controller';
import { RequirementsController } from '../../src/requirements/requirements.controller';
import { ScreeningsController } from '../../src/screenings/screenings.controller';
import { VisitsController } from '../../src/visits/visits.controller';

/** Every controller reachable from `AppModule`. */
export const ALL_CONTROLLERS = [
  AcademicController,
  AppointmentsController,
  AuditController,
  AuthController,
  CertificatesController,
  ClearancesController,
  CommunicationsController,
  DispensingController,
  DocumentsController,
  EmergenciesController,
  EvidenceController,
  HealthController,
  InventoryController,
  PatientsController,
  UsersController,
  ReportsController,
  RequirementsController,
  ScreeningsController,
  VisitsController,
] as const;

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.HEAD]: 'head',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.ALL]: 'all',
};

export const API_PREFIX = 'api/v1';

export interface DiscoveredRoute {
  controller: string;
  handler: string;
  method: string;
  path: string;
  roles: UserRole[];
  permissions: Permission[];
  isPublic: boolean;
}

function joinPaths(prefix: string, suffix: string): string {
  const combined = `${prefix}/${suffix}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return combined.length > 1 ? combined : '/';
}

/**
 * Walks the controller classes and reads the authorization metadata exactly as
 * the runtime guards do — through `Reflector`, so handler-level declarations
 * override class-level ones the same way in production.
 */
export function discoverRoutes(controllers: readonly Function[] = ALL_CONTROLLERS): DiscoveredRoute[] {
  const reflector = new Reflector();
  const routes: DiscoveredRoute[] = [];

  for (const controller of controllers) {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) as string;
    const targets = controller.prototype
      ? Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== 'constructor')
      : [];

    for (const handler of targets) {
      const methodPath = Reflect.getMetadata(PATH_METADATA, controller.prototype[handler]) as string | undefined;
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, controller.prototype[handler]) as
        | number
        | undefined;
      if (methodPath === undefined || requestMethod === undefined) continue;

      const handlerFn = controller.prototype[handler];
      const lookup = [handlerFn, controller] as unknown as Array<() => void>;

      routes.push({
        controller: controller.name,
        handler,
        method: METHOD_NAMES[requestMethod] ?? 'all',
        path: joinPaths(joinPaths(`/${API_PREFIX}`, controllerPath), methodPath),
        roles: reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, lookup) ?? [],
        permissions: reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, lookup) ?? [],
        isPublic: reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, lookup) ?? false,
      });
    }
  }

  return routes.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}
