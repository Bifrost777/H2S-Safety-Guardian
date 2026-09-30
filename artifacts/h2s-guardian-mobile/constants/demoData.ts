export type ShiftRecord = {
  id: string;
  date: string;
  location: string;
  duration: string;
  peak: number;
  status: 'Clear' | 'Reviewed';
};

export const ppmSeries = [2, 3, 4, 3, 5, 4, 6, 5, 4, 7, 5, 4];

export const exposurePoints = [
  { label: '08:00', value: 2 },
  { label: '09:00', value: 3 },
  { label: '10:00', value: 4 },
  { label: '11:00', value: 7 },
  { label: '12:00', value: 5 },
  { label: '13:00', value: 4 },
  { label: '14:00', value: 3 },
  { label: '15:00', value: 5 },
  { label: '16:00', value: 4 },
];

export const shiftRecords: ShiftRecord[] = [
  { id: 'S-2409', date: 'Sep 29, 2026', location: 'North Process Bay', duration: '08h 12m', peak: 7, status: 'Clear' },
  { id: 'S-2408', date: 'Sep 28, 2026', location: 'Wellhead Cluster 04', duration: '07h 48m', peak: 5, status: 'Clear' },
  { id: 'S-2407', date: 'Sep 27, 2026', location: 'Maintenance Corridor', duration: '06h 55m', peak: 11, status: 'Reviewed' },
  { id: 'S-2406', date: 'Sep 26, 2026', location: 'North Process Bay', duration: '08h 03m', peak: 4, status: 'Clear' },
];

export const stripReadings = [
  { id: 'safe', title: 'Safe band', ppm: '< 10 ppm', note: 'No visible darkening', color: '#CBFF38' },
  { id: 'caution', title: 'Caution band', ppm: '10–50 ppm', note: 'Faint amber shift', color: '#F3B33D' },
  { id: 'alert', title: 'Alert band', ppm: '> 50 ppm', note: 'Deep brown shift', color: '#A66C45' },
];
