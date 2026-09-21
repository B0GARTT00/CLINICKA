// Keep the active module on the same Prisma-backed patient service used by the
// rest of the API, rather than maintaining a second in-memory patient store.
export { PatientsService } from '../../patients/patients.service';
