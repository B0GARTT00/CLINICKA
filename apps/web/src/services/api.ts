import axios from 'axios';
import type { ApiEnvelope, ApiHealth, AuthSession } from '@bchealth/types';

export type Patient = {
  id: string;
  patientNumber: string;
  type: 'STUDENT' | 'FACULTY' | 'STAFF';
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  studentProfile?: { studentId: string; program: string; yearLevel?: number | null; section?: string | null } | null;
  employeeProfile?: { employeeId: string; department: string; position?: string | null } | null;
  user?: { id: string } | null;
  allergies?: { id: string; allergen: string; reaction?: string | null; severity?: string | null; isActive: boolean }[];
  conditions?: { id: string; name: string; isActive: boolean }[];
  emergencyContacts?: { id: string; name: string; relationship: string; phone: string }[];
  visits?: { id: string; visitDate: string; chiefComplaint?: string | null; status: string }[];
};

const ACCESS_TOKEN_KEY = 'bchealth.accessToken';
const REFRESH_TOKEN_KEY = 'bchealth.refreshToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) throw error;

    originalRequest._retry = true;
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw error;

    try {
      const session = await refreshSession(refreshToken);
      setSession(session);
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      throw refreshError;
    }
  },
);

export async function getHealth() {
  const response = await api.get<ApiEnvelope<ApiHealth>>('/health');
  return response.data.data ?? response.data;
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthSession>('/auth/login', { email, password });
  setSession(response.data);
  return response.data;
}

export async function signup(email: string, displayName: string, password: string, patientType: Patient['type']) {
  const response = await api.post<{ message: string; verificationUrl?: string }>('/auth/signup', { email, displayName, password, patientType });
  return response.data;
}

export async function refreshSession(refreshToken: string) {
  const response = await axios.post<AuthSession>(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { withCredentials: true },
  );
  return response.data;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
  }
  clearSession();
}

export async function getCurrentUser() {
  const response = await api.get<AuthSession['user']>('/auth/me');
  return response.data;
}

export async function getPatients(search?: string, page = 1, limit = 20, type?: Patient['type']) {
  const response = await api.get<Patient[]>('/patients', { params: { search, page, limit, type } });
  return response.data;
}

export async function getPatient(id: string) {
  const response = await api.get<Patient>(`/patients/${id}`);
  return response.data;
}

export type PatientInput = {
  type: Patient['type'];
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  email?: string;
  phone?: string;
  address?: string;
  sex?: string;
  program?: string;
  department?: string;
  yearLevel?: number;
  studentId?: string;
  employeeId?: string;
};

export async function createPatient(data: PatientInput) {
  const response = await api.post<Patient>('/patients', data);
  return response.data;
}

export async function updatePatient(id: string, data: Partial<PatientInput>) {
  const response = await api.patch<Patient>(`/patients/${id}`, data);
  return response.data;
}

export type ClinicVisit = {
  id: string;
  patientId: string;
  visitDate: string;
  chiefComplaint?: string | null;
  status: 'OPEN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  patient: Pick<Patient, 'id' | 'patientNumber' | 'firstName' | 'lastName'>;
  vitalSigns?: { id: string; temperatureC?: number | string | null; systolicBp?: number | null; diastolicBp?: number | null }[];
};

export async function getVisitQueue() {
  const response = await api.get<ClinicVisit[]>('/clinic-visits/queue');
  return response.data;
}

export async function createVisit(data: { patientId: string; chiefComplaint?: string; notes?: string }) {
  const response = await api.post<ClinicVisit>('/clinic-visits', data);
  return response.data;
}

export async function recordVitalSigns(id: string, data: Record<string, number>) {
  const response = await api.post(`/clinic-visits/${id}/vital-signs`, data);
  return response.data;
}

export async function updateVisitStatus(id: string, status: ClinicVisit['status']) {
  const response = await api.patch<ClinicVisit>(`/clinic-visits/${id}/status`, { status });
  return response.data;
}

export async function createConsultation(id: string, data: {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnoses?: { description: string }[];
  treatments?: { description: string }[];
  prescriptionInstructions?: string;
  prescriptionItems?: { medicineName: string; dosage: string; frequency: string; duration?: string }[];
}) {
  const response = await api.post(`/clinic-visits/${id}/consultation`, data);
  return response.data;
}

export type Appointment = {
  id: string;
  scheduledAt: string;
  durationMins: number;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'>;
};

export async function getAppointments() {
  const response = await api.get<Appointment[]>('/appointments');
  return response.data;
}

export async function createAppointment(data: { patientId: string; scheduledAt: string; purpose: string; durationMins?: number; notes?: string }) {
  const response = await api.post<Appointment>('/appointments', data);
  return response.data;
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  const response = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
  return response.data;
}

export async function checkInAppointment(id: string) {
  const response = await api.post<ClinicVisit>(`/appointments/${id}/check-in`);
  return response.data;
}

export type HealthRequirement = {
  id: string;
  name: string;
  description?: string | null;
  applicableTo: string;
  deadline?: string | null;
  _count?: { submissions: number };
};

export type RequirementSubmission = {
  id: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  submittedAt: string;
  notes?: string | null;
  requirement: Pick<HealthRequirement, 'name'>;
  patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'>;
};

export async function getRequirements() {
  const response = await api.get<HealthRequirement[]>('/requirements');
  return response.data;
}

export async function getRequirementSubmissions() {
  const response = await api.get<RequirementSubmission[]>('/requirements/submissions');
  return response.data;
}

export async function reviewRequirementSubmission(id: string, status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW', notes?: string) {
  const response = await api.post<RequirementSubmission>(`/requirements/submissions/${id}/review`, { status, notes });
  return response.data;
}

export type Clearance = {
  id: string;
  type: string;
  status: 'PENDING' | 'INCOMPLETE' | 'FOR_REVIEW' | 'CLEARED' | 'REJECTED' | 'EXPIRED';
  remarks?: string | null;
  patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'>;
  academicYear: { label: string };
};

export async function getClearances() {
  const response = await api.get<Clearance[]>('/clearances');
  return response.data;
}

export async function checkClearanceEligibility(patientId: string) {
  const response = await api.get<{ eligible: boolean; requirements: { name: string; verified: boolean }[] }>(`/clearances/eligibility/${patientId}`);
  return response.data;
}

export async function createClearance(data: { patientId: string; type: string }) {
  const response = await api.post<Clearance>('/clearances', data);
  return response.data;
}

export async function reviewClearance(id: string, status: 'CLEARED' | 'REJECTED', remarks?: string) {
  const response = await api.post<Clearance>(`/clearances/${id}/review`, { status, remarks });
  return response.data;
}

export type VaccinationRecord = { id: string; vaccineName: string; dose: string; administeredAt: string; nextDoseAt?: string | null; patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'> };
export type ScreeningRecord = { id: string; screeningType: string; screenedAt: string; result: string; findings?: string | null; patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'> };

export async function getVaccinations() {
  const response = await api.get<VaccinationRecord[]>('/health-records/vaccinations');
  return response.data;
}

export async function getScreenings() {
  const response = await api.get<ScreeningRecord[]>('/health-records/screenings');
  return response.data;
}

export async function createVaccination(data: { patientId: string; vaccineName: string; dose: string; administeredAt: string; nextDoseAt?: string; remarks?: string }) {
  const response = await api.post<VaccinationRecord>('/health-records/vaccinations', data);
  return response.data;
}

export async function createScreening(data: { patientId: string; screeningType: string; screenedAt: string; result: string; findings?: string }) {
  const response = await api.post<ScreeningRecord>('/health-records/screenings', data);
  return response.data;
}

export type MedicalCertificate = { id: string; certificateNumber: string; type: string; purpose: string; issuedAt: string; validUntil?: string | null; remarks?: string | null; patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'> };

export async function getCertificates() {
  const response = await api.get<MedicalCertificate[]>('/certificates');
  return response.data;
}

export async function createCertificate(data: { patientId: string; type: string; purpose: string; validUntil?: string; remarks?: string }) {
  const response = await api.post<MedicalCertificate>('/certificates', data);
  return response.data;
}

export type EmergencyCase = { id: string; occurredAt: string; emergencyType: string; description: string; actionTaken: string; treatment?: string | null; disposition?: string | null; patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'> };

export async function getEmergencies() {
  const response = await api.get<EmergencyCase[]>('/emergencies');
  return response.data;
}

export async function createEmergency(data: { patientId: string; occurredAt: string; emergencyType: string; description: string; actionTaken: string; treatment?: string; disposition?: string; remarks?: string }) {
  const response = await api.post<EmergencyCase>('/emergencies', data);
  return response.data;
}

export type Announcement = { id: string; title: string; body: string; audience: string; publishedAt?: string | null; expiresAt?: string | null };
export type Notification = { id: string; title: string; body: string; type: string; isRead: boolean; createdAt: string };

export async function getAnnouncements() {
  const response = await api.get<Announcement[]>('/announcements');
  return response.data;
}

export async function createAnnouncement(data: { title: string; body: string; audience: string; expiresAt?: string }) {
  const response = await api.post<Announcement>('/announcements', data);
  return response.data;
}

export async function publishAnnouncement(id: string) {
  const response = await api.post<Announcement>(`/announcements/${id}/publish`);
  return response.data;
}

export async function getNotifications() {
  const response = await api.get<Notification[]>('/notifications');
  return response.data;
}

export async function markNotificationRead(id: string) {
  const response = await api.post<Notification>(`/notifications/${id}/read`);
  return response.data;
}

export type ReportsSummary = { patients: number; visitsToday: number; visitsCompleted: number; appointmentsUpcoming: number; pendingRequirements: number; clearancesForReview: number; medicines: number; lowStock: number };

export async function getReportsSummary() {
  const response = await api.get<ReportsSummary>('/reports/summary');
  return response.data;
}

export type AdminUser = { id: string; email: string; displayName: string; status: string; patientId?: string | null; roles: { id: string; name: string }[]; createdAt: string };

export async function getAdminUsers() {
  const response = await api.get<{ data: AdminUser[]; meta: { page: number; limit: number; total: number; totalPages: number } }>('/users');
  return response.data.data;
}

export type AdminRole = { id: string; name: string; description?: string | null; _count: { users: number }; permissions: { permission: { key: string; description?: string | null } }[] };

export async function getAdminRoles() {
  const response = await api.get<AdminRole[]>('/users/roles');
  return response.data;
}

export type AcademicYear = { id: string; label: string; startsAt: string; endsAt: string; isActive: boolean; semesters: { id: string; label: string; term: string; startsAt: string; endsAt: string; isActive: boolean }[]; _count: { requirements: number; clearances: number } };

export async function getAcademicYears() {
  const response = await api.get<AcademicYear[]>('/academic-years');
  return response.data;
}

export async function createAcademicYear(data: { label: string; startsAt: string; endsAt: string }) {
  const response = await api.post<AcademicYear>('/academic-years', data);
  return response.data;
}

export type AuditLog = { id: string; action: string; entity: string; entityId?: string | null; createdAt: string; actor?: { displayName: string; email: string } | null };

export async function getAuditLogs(action?: string, entity?: string) {
  const response = await api.get<AuditLog[]>('/audit-logs', { params: { action: action || undefined, entity: entity || undefined } });
  return response.data;
}

export type Medicine = { id: string; name: string; genericName?: string | null; dosageForm: string; unit: string; reorderLevel: number; stock: number; lowStock: boolean; batches: { id: string; batchNumber: string; quantity: number; expiresAt: string }[] };

export async function getMedicines() {
  const response = await api.get<Medicine[]>('/inventory/medicines');
  return response.data;
}

export async function createMedicine(data: { name: string; genericName?: string; dosageForm: string; unit: string; reorderLevel: number }) {
  const response = await api.post<Medicine>('/inventory/medicines', data);
  return response.data;
}

export async function stockInMedicine(data: { medicineId: string; batchNumber: string; expiresAt: string; quantity: number; supplier?: string }) {
  const response = await api.post('/inventory/stock-in', data);
  return response.data;
}

export type Dispensation = { id: string; createdAt: string; patient: Pick<Patient, 'patientNumber' | 'firstName' | 'lastName'>; items: { quantity: number; medicineBatch: { batchNumber: string; medicine: { name: string } } }[] };

export async function getDispensations() {
  const response = await api.get<Dispensation[]>('/inventory/dispensing');
  return response.data;
}

export async function createDispensation(data: { patientId: string; items: { medicineBatchId: string; quantity: number; instructions?: string }[]; notes?: string }) {
  const response = await api.post<Dispensation>('/inventory/dispensing', data);
  return response.data;
}

export function setSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem('bchealth.user', JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('bchealth.user');
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
