import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { defaultCalibration, type CalibrationEntry } from '@/constants/calibration';
import type { StripAnalysis, StripRoi } from '@/services/stripAnalysis';

export type AnalysisRecord = {
  id: string;
  createdAt: string;
  source: 'camera' | 'gallery' | 'sample';
  sourceLabel: string;
  imageUri?: string;
  roi: StripRoi;
  analysis: StripAnalysis;
  calibrationStatus: 'experimental';
};

const RECORDS_KEY = 'h2s-guardian-analysis-records-v1';
const CALIBRATION_KEY = 'h2s-guardian-calibration-v1';

async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function write(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function getAnalysisRecords(): Promise<AnalysisRecord[]> {
  const raw = await read(RECORDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnalysisRecord[];
  } catch {
    return [];
  }
}

export async function saveAnalysisRecord(record: AnalysisRecord) {
  const records = await getAnalysisRecords();
  await write(RECORDS_KEY, JSON.stringify([record, ...records].slice(0, 25)));
}

export async function deleteAnalysisRecord(id: string) {
  const records = await getAnalysisRecords();
  await write(
    RECORDS_KEY,
    JSON.stringify(records.filter((record) => record.id !== id)),
  );
}

export async function getCalibrationEntries(): Promise<CalibrationEntry[]> {
  const raw = await read(CALIBRATION_KEY);
  if (!raw) return defaultCalibration;
  try {
    return JSON.parse(raw) as CalibrationEntry[];
  } catch {
    return defaultCalibration;
  }
}

export async function saveCalibrationEntries(entries: CalibrationEntry[]) {
  await write(CALIBRATION_KEY, JSON.stringify(entries));
}