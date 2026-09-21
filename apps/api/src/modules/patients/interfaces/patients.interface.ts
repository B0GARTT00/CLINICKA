export interface Patient {
  id: string;
  patientNumber: string;
  type: 'STUDENT' | 'FACULTY' | 'STAFF';
  firstName: string;
  lastName: string;
  email: string;
  middleName?: string;
  suffix?: string;
  phone?: string;
  address?: string;
  sex?: string;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
