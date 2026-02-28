import type { TableCalibration } from '../../types/shared';

const STORAGE_KEY = 'tabletiles_calibration';

export function saveCalibration(calibration: TableCalibration): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration));
  } catch (error) {
    console.error('Failed to save calibration:', error);
  }
}

export function loadCalibration(): TableCalibration | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const calibration = JSON.parse(stored) as TableCalibration;

    // Validate that it has the expected structure
    if (!calibration.corners || !calibration.homographyMatrix) {
      return null;
    }

    return calibration;
  } catch (error) {
    console.error('Failed to load calibration:', error);
    return null;
  }
}

export function clearCalibration(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear calibration:', error);
  }
}

export function hasCalibration(): boolean {
  return loadCalibration() !== null;
}
