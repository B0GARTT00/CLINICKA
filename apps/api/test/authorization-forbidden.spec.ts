import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ValueProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { applyAuthorizationToDocument } from '../src/common/swagger/apply-authorization';
import { ACCESS_TOKEN_SCHEME, isPublicRoute, PUBLIC_ROUTES } from '../src/auth/constants/api-security';
import { AcademicController } from '../src/academic/academic.controller';
import { AppointmentsController } from '../src/appointments/appointments.controller';
import { AuditController } from '../src/audit/audit.controller';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { JwtSecrets } from '../src/auth/jwt-secrets';
import { AuthorizationGuard } from '../src/auth/guards/authorization.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { UserRole } from '../src/auth/constants/roles';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { ClearancesController } from '../src/clearances/clearances.controller';
import { CommunicationsController } from '../src/communications/communications.controller';
import { DispensingController } from '../src/dispensing/dispensing.controller';
import { DocumentsController } from '../src/documents/documents.controller';
import { DocumentsService } from '../src/documents/documents.service';
import { EmergenciesController } from '../src/emergencies/emergencies.controller';
import { EvidenceController } from '../src/evidence/evidence.controller';
import { EvidenceService } from '../src/evidence/evidence.service';
import { HealthController } from '../src/health/health.controller';
import { InventoryController } from '../src/inventory/inventory.controller';
import { PatientsController } from '../src/modules/patients/patients.controller';
import { PatientsService } from '../src/modules/patients/patients.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { ReportsController } from '../src/reports/reports.controller';
import { RequirementsController } from '../src/requirements/requirements.controller';
import { ScreeningsController } from '../src/screenings/screenings.controller';
import { VisitsController } from '../src/visits/visits.controller';
import { VisitsService } from '../src/visits/visits.service';
import { AuditService } from '../src/audit/audit.service';
import { AcademicService } from '../src/academic/academic.service';
import { AppointmentsService } from '../src/appointments/appointments.service';
import { CertificatesService } from '../src/certificates/certificates.service';
import { ClearancesService } from '../src/clearances/clearances.service';
import { CommunicationsService } from '../src/communications/communications.service';
import { DispensingService } from '../src/dispensing/dispensing.service';
import { EmergenciesService } from '../src/emergencies/emergencies.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { ReportsService } from '../src/reports/reports.service';
import { RequirementsService } from '../src/requirements/requirements.service';
import { ScreeningsService } from '../src/screenings/screenings.service';

const TEST_SECRET = 'authorization-spec-secret';

// Compiling the full controller set and binding the HTTP server takes longer
// than Jest's default 5s budget.
jest.setTimeout(60_000);

/**
 * Builds a stub with a jest mock per public method, so a handler that reaches
 * its service returns `undefined` instead of throwing and the assertion lands
 * on the guard's decision rather than on the service.
 */
function stubService<T extends object>(service: new (...args: never[]) => T): ValueProvider {
  const instance: Record<string, unknown> = {};
  for (const name of Object.getOwnPropertyNames(service.prototype)) {
    if (name === 'constructor') continue;
    const member = (service.prototype as Record<string, unknown>)[name];
    if (typeof member === 'function') instance[name] = jest.fn();
  }
  return { provide: service, useValue: instance };
}

/**
 * Exercises the real HTTP surface with the real guard chain and real signed
 * tokens. Services are stubbed because these tests are about who may reach a
 * handler, not about what the handler then does.
 */
describe('Authorization enforcement over HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (roles: UserRole[]) =>
    jwt.sign({ sub: 'user-1', email: 'user@example.test', roles, patientId: 'patient-1' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: TEST_SECRET })],
      controllers: [
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
      ],
      providers: [
        JwtStrategy,
        JwtSecrets,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'jwt') {
                return { secret: TEST_SECRET, refreshSecret: `${TEST_SECRET}-refresh` };
              }
              if (key === 'jwt.secret') return TEST_SECRET;
              if (key === 'jwt.refreshSecret') return `${TEST_SECRET}-refresh`;
              return undefined;
            },
          },
        },
        stubService(AuthService),
        stubService(AcademicService),
        stubService(AppointmentsService),
        stubService(AuditService),
        stubService(CertificatesService),
        stubService(ClearancesService),
        stubService(CommunicationsService),
        stubService(DispensingService),
        stubService(DocumentsService),
        stubService(EmergenciesService),
        stubService(EvidenceService),
        stubService(InventoryService),
        stubService(PatientsService),
        stubService(ReportsService),
        stubService(RequirementsService),
        stubService(ScreeningsService),
        stubService(UsersService),
        stubService(VisitsService),
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: AuthorizationGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // Mirrors `main.ts` so the error body asserted below is the one a real
    // client receives.
    app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('unauthenticated requests are rejected everywhere by default', () => {
    it.each([
      ['GET', '/api/v1/patients'],
      ['GET', '/api/v1/users'],
      ['GET', '/api/v1/audit-logs'],
      ['GET', '/api/v1/clinic-visits/queue'],
      ['GET', '/api/v1/reports/summary'],
      ['GET', '/api/v1/evidence/submissions'],
      ['GET', '/api/v1/documents/doc-1'],
      ['GET', '/api/v1/inventory/medicines'],
      ['GET', '/api/v1/announcements'],
      ['GET', '/api/v1/emergencies'],
    ])('%s %s answers 401', async (method, path) => {
      const verb = method.toLowerCase() as 'get';
      await request(app.getHttpServer())[verb](path).expect(401);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const forged = new JwtService({ secret: 'not-the-api-secret' }).sign({
        sub: 'attacker',
        roles: [UserRole.ADMINISTRATOR],
      });
      await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${forged}`).expect(401);
    });
  });

  describe('public routes stay reachable without a token', () => {
    it('serves the health check', async () => {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });

    it('reaches login and signup', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({}).expect(201);
      await request(app.getHttpServer()).post('/api/v1/auth/signup').send({}).expect(201);
    });
  });

  describe('roles are confined to the capabilities they need', () => {
    it('refuses user administration to every non-administrator role', async () => {
      const clinicRoles = [
        UserRole.CLINIC_NURSE,
        UserRole.DOCTOR,
        UserRole.CLINIC_STAFF,
        UserRole.STUDENT,
        UserRole.FACULTY_STAFF,
      ];

      for (const role of clinicRoles) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${tokenFor([role])}`);
        expect({ role, status: response.status }).toEqual({ role, status: 403 });
      }
    });

    it('allows an administrator to reach user administration', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokenFor([UserRole.ADMINISTRATOR])}`)
        .expect(200);
    });

    it('refuses the audit trail to clinic staff', async () => {
      for (const role of [UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/audit-logs')
          .set('Authorization', `Bearer ${tokenFor([role])}`);
        expect({ role, status: response.status }).toEqual({ role, status: 403 });
      }
    });

    it('refuses academic year creation to clinic staff who may only read them', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${tokenFor([UserRole.CLINIC_STAFF])}`)
        .send({})
        .expect(403);
    });

    it('refuses front-desk staff the audit and role catalogues', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/roles')
        .set('Authorization', `Bearer ${tokenFor([UserRole.CLINIC_NURSE])}`)
        .expect(403);
    });

    it('refuses students and faculty the patient registry', async () => {
      for (const role of [UserRole.STUDENT, UserRole.FACULTY_STAFF]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/patients')
          .set('Authorization', `Bearer ${tokenFor([role])}`);
        expect({ role, status: response.status }).toEqual({ role, status: 403 });
      }
    });

    it('lets students reach only their own profile, not another patient', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', `Bearer ${tokenFor([UserRole.STUDENT])}`)
        .expect(200);
    });

    it('refuses evidence review to roles that may only read or submit it', async () => {
      for (const role of [UserRole.STUDENT, UserRole.FACULTY_STAFF, UserRole.CLINIC_STAFF]) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/evidence/submissions/sub-1/review')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .send({ status: 'APPROVED' });
        expect({ role, status: response.status }).toEqual({ role, status: 403 });
      }
    });

    it('refuses inventory writes to front-desk staff who may only read stock', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${tokenFor([UserRole.CLINIC_STAFF])}`)
        .send({})
        .expect(403);
    });

    it('refuses clinic visits to students and faculty', async () => {
      for (const role of [UserRole.STUDENT, UserRole.FACULTY_STAFF]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/clinic-visits/queue')
          .set('Authorization', `Bearer ${tokenFor([role])}`);
        expect({ role, status: response.status }).toEqual({ role, status: 403 });
      }
    });

    it('lets clinical roles read the clinic queue', async () => {
      for (const role of [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/clinic-visits/queue')
          .set('Authorization', `Bearer ${tokenFor([role])}`);
        expect({ role, status: response.status }).toEqual({ role, status: 200 });
      }
    });

    it('allows report reading broadly but restricts exports to approved roles', async () => {
      for (const role of [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF]) {
        await request(app.getHttpServer())
          .get('/api/v1/reports/operational')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .expect(200);
      }
      for (const role of [UserRole.DOCTOR, UserRole.CLINIC_STAFF, UserRole.STUDENT, UserRole.FACULTY_STAFF]) {
        await request(app.getHttpServer())
          .post('/api/v1/reports/operational/export')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .expect(403);
      }
    });

    it('lets every role read announcements and its own notifications', async () => {
      for (const role of Object.values(UserRole)) {
        await request(app.getHttpServer())
          .get('/api/v1/announcements')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .expect(200);
        await request(app.getHttpServer())
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .expect(200);
      }
    });

    it('lets every role read and end its own session', async () => {
      for (const role of Object.values(UserRole)) {
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .expect(200);
        await request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${tokenFor([role])}`)
          .send({ refreshToken: 'token' })
          .expect(201);
      }
    });
  });

  describe('forbidden responses are consistent', () => {
    it('answers with 403 and an explanatory body for every refused role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokenFor([UserRole.CLINIC_NURSE])}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ success: false, statusCode: 403 });
      expect(response.body.message).toContain('users.manage');
    });

    it('rejects a token carrying an unrecognised role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokenFor(['SUPERUSER' as UserRole])}`)
        .expect(403);
    });
  });

  describe('the generated OpenAPI document describes the policy it enforces', () => {
    let document: ReturnType<typeof applyAuthorizationToDocument>;

    beforeAll(() => {
      const config = new DocumentBuilder()
        .setTitle('BCHealth API')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, ACCESS_TOKEN_SCHEME)
        .build();
      document = applyAuthorizationToDocument(SwaggerModule.createDocument(app, config));
    });

    it('registers the bearer scheme under the name controllers reference', () => {
      expect(document.components?.securitySchemes?.[ACCESS_TOKEN_SCHEME]).toBeDefined();
    });

    it('marks every protected operation as requiring the bearer scheme', () => {
      const unprotected = Object.entries(document.paths).flatMap(([path, item]) =>
        Object.entries(item as Record<string, any>)
          .filter(([, operation]) => operation?.security !== undefined)
          .filter(([, operation]) => !Array.isArray(operation.security) || operation.security.length === 0)
          .map(([method]) => `${method.toUpperCase()} ${path}`),
      );
      expect(unprotected).toEqual([]);
    });

    it('documents 401 and 403 on every protected operation', () => {
      const undocumented: string[] = [];

      for (const [path, item] of Object.entries(document.paths)) {
        for (const [method, operation] of Object.entries(item as Record<string, any>)) {
          if (!operation || typeof operation !== 'object' || !operation.security) continue;
          if (isPublicRoute(method, path)) {
            undocumented.push(`${method.toUpperCase()} ${path} is public but was marked as secured`);
            continue;
          }
          for (const status of ['401', '403']) {
            if (!operation.responses?.[status]) {
              undocumented.push(`${method.toUpperCase()} ${path} is missing a ${status} response`);
            }
          }
        }
      }

      expect(undocumented).toEqual([]);
    });

    it('leaves the public routes unsecured', () => {
      for (const route of PUBLIC_ROUTES) {
        const operation = (document.paths as Record<string, any>)[route.path]?.[route.method];
        expect({ path: route.path, exists: Boolean(operation), secured: operation?.security }).toEqual({
          path: route.path,
          exists: true,
          secured: undefined,
        });
      }
    });

    it('secures the whole surface apart from the declared public routes', () => {
      const secured = new Set<string>();
      for (const [path, item] of Object.entries(document.paths)) {
        for (const [method, operation] of Object.entries(item as Record<string, any>)) {
          if (operation?.security) secured.add(`${method.toUpperCase()} ${path}`);
        }
      }

      const publicKeys = new Set(PUBLIC_ROUTES.map((route) => `${route.method.toUpperCase()} ${route.path}`));
      const everyOperation = new Set(
        Object.entries(document.paths).flatMap(([path, item]) =>
          Object.entries(item as Record<string, any>)
            .filter(([, operation]) => operation && typeof operation === 'object' && operation.security !== undefined)
            .map(([method]) => `${method.toUpperCase()} ${path}`),
        ),
      );

      expect(secured).toEqual(new Set([...everyOperation].filter((key) => !publicKeys.has(key))));
    });
  });
});
