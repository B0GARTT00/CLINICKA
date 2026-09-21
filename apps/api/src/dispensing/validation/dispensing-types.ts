/**
 * Dispensing validation result.
 */
export interface DispensingValidationResult {
  valid: boolean;
  errors: DispensingValidationError[];
  warnings: DispensingValidationWarning[];
}

export interface DispensingValidationError {
  code: string;
  message: string;
  itemId?: string;
  medicineName?: string;
}

export interface DispensingValidationWarning {
  code: string;
  message: string;
}

/**
 * Dispensing limits configuration.
 */
export interface DispensingLimits {
  maxItemsPerDispensation: number;
  maxQuantityPerMedicine: number;
}

/**
 * Default dispensing limits.
 */
export const DEFAULT_DISPENSING_LIMITS: DispensingLimits = {
  maxItemsPerDispensation: 10,
  maxQuantityPerMedicine: 100,
};