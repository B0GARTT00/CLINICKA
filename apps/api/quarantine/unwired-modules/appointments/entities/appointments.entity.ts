export class AppointmentEntity {
  id: string;
  patientId: string;
  appointmentDate: string;
  reason?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
