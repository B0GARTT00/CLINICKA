export interface Appointment {
  id: string;
  patientId: string;
  appointmentDate: Date;
  reason?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
