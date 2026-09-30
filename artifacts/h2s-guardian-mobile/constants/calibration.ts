export type CalibrationEntry = {
  id: string;
  label: string;
  hex: string;
  referenceValue: string;
  status: 'experimental';
};

export const defaultCalibration: CalibrationEntry[] = [
  {
    id: 'clear-reference',
    label: 'Clear reference tone',
    hex: '#D5C98E',
    referenceValue: 'Add experimentally measured value later',
    status: 'experimental',
  },
  {
    id: 'caution-reference',
    label: 'Caution reference tone',
    hex: '#B78A52',
    referenceValue: 'Add experimentally measured value later',
    status: 'experimental',
  },
  {
    id: 'alert-reference',
    label: 'Alert reference tone',
    hex: '#7D4E3A',
    referenceValue: 'Add experimentally measured value later',
    status: 'experimental',
  },
];

export const CALIBRATION_STATUS =
  'Experimental colour analysis — not calibrated';