import { Injectable } from '@nestjs/common';

export interface PatientsReport {
  total: number;
  byType: Record<string, number>;
}

export interface VisitsReport {
  total: number;
  byMonth: Record<string, number>;
}

export interface VaccinationsReport {
  total: number;
  byVaccine: Record<string, number>;
}

export interface ScreeningsReport {
  total: number;
  byType: Record<string, number>;
}

export interface InventoryReport {
  total: number;
  lowStock: number;
}

@Injectable()
export class ReportsService {
  getPatientsReport(): PatientsReport {
    return { total: 0, byType: {} };
  }

  getVisitsReport(): VisitsReport {
    return { total: 0, byMonth: {} };
  }

  getVaccinationsReport(): VaccinationsReport {
    return { total: 0, byVaccine: {} };
  }

  getScreeningsReport(): ScreeningsReport {
    return { total: 0, byType: {} };
  }

  getInventoryReport(): InventoryReport {
    return { total: 0, lowStock: 0 };
  }
}
