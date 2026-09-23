import { Medication, IntakeLog, StoredPrescription, AlarmSettings } from '@/types/medication';

const MEDS_KEY = 'mymedies_medications_v1';
const LOGS_KEY = 'mymedies_intake_logs_v1';
const SCRIPTS_KEY = 'mymedies_prescriptions_v1';
const STREAK_KEY = 'mymedies_streak_v1';
const ALARM_SETTINGS_KEY = 'mymedies_alarm_settings_v1';

// In-memory fallback cache if localStorage is unavailable (e.g., incognito or quota exceeded)
const memoryCache: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch (e) {
    console.warn(`localStorage getItem failed for ${key}, falling back to memory:`, e);
  }
  return memoryCache[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  memoryCache[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage setItem failed for ${key} (quota or private mode), kept in memory:`, e);
  }
}

/**
 * Returns a YYYY-MM-DD string according to the local user's calendar date,
 * avoiding UTC desync around midnight.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DEFAULT_ALARM_SETTINGS: AlarmSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  exactAlarmsEnabled: true,
  morningTime: '08:00',
  afternoonTime: '13:00',
  eveningTime: '19:00',
  nightTime: '22:00',
};

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Amoxicillin & Clavulanate',
    genericName: 'Augmentin',
    dosage: '625 mg',
    form: 'tablet',
    frequency: 'Twice daily (1-0-1)',
    timing: ['morning', 'night'],
    defaultTimes: ['08:00', '20:00'],
    relationToMeal: 'after_meal',
    durationDays: 5,
    startDate: getLocalDateString(),
    remainingCount: 7,
    totalCount: 10,
    instructions: 'Complete full course even if feeling better',
    warning: 'Take with food to prevent upset stomach',
  },
  {
    id: 'med-2',
    name: 'Paracetamol',
    genericName: 'Dolo 650',
    dosage: '650 mg',
    form: 'tablet',
    frequency: 'As needed (max 3x/day)',
    timing: ['afternoon'],
    defaultTimes: ['13:00'],
    relationToMeal: 'after_meal',
    durationDays: 3,
    startDate: getLocalDateString(),
    remainingCount: 4,
    totalCount: 10,
    instructions: 'Take for fever or body ache only',
    warning: 'Maintain 6 hours interval between doses',
  },
  {
    id: 'med-3',
    name: 'Pantoprazole Gastro-resistant',
    genericName: 'Pan-40',
    dosage: '40 mg',
    form: 'tablet',
    frequency: 'Once daily before breakfast',
    timing: ['morning'],
    defaultTimes: ['07:30'],
    relationToMeal: 'before_meal',
    durationDays: 14,
    startDate: getLocalDateString(),
    remainingCount: 11,
    totalCount: 14,
    instructions: 'Swallow whole with a full glass of water 30 mins before food',
    warning: 'Do not crush or chew',
  },
];

export function getStoredMedications(): Medication[] {
  const raw = safeGetItem(MEDS_KEY);
  if (!raw) {
    safeSetItem(MEDS_KEY, JSON.stringify(INITIAL_MEDICATIONS));
    return INITIAL_MEDICATIONS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MEDICATIONS;
  } catch (e) {
    console.error('Failed to parse stored medications', e);
    return INITIAL_MEDICATIONS;
  }
}

export function saveStoredMedications(meds: Medication[]): void {
  safeSetItem(MEDS_KEY, JSON.stringify(meds));
}

export function getStoredLogs(): IntakeLog[] {
  const raw = safeGetItem(LOGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse logs', e);
    return [];
  }
}

export function saveStoredLogs(logs: IntakeLog[]): void {
  safeSetItem(LOGS_KEY, JSON.stringify(logs));
}

export function getStoredPrescriptions(): StoredPrescription[] {
  const raw = safeGetItem(SCRIPTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse prescriptions', e);
    return [];
  }
}

export function saveStoredPrescriptions(scripts: StoredPrescription[]): void {
  try {
    safeSetItem(SCRIPTS_KEY, JSON.stringify(scripts));
  } catch (e) {
    // If quota exceeded, strip heavy image payloads from older prescriptions and retry
    try {
      const lightweight = scripts.map((s, idx) => (idx === 0 ? s : { ...s, imageUrl: undefined }));
      safeSetItem(SCRIPTS_KEY, JSON.stringify(lightweight));
    } catch {
      console.error('Failed to save prescriptions even with lightweight images', e);
    }
  }
}

export function getStreakCount(): number {
  const count = safeGetItem(STREAK_KEY);
  return count ? parseInt(count, 10) || 5 : 5;
}

export function setStreakCount(count: number): void {
  safeSetItem(STREAK_KEY, count.toString());
}

export function getStoredAlarmSettings(): AlarmSettings {
  const raw = safeGetItem(ALARM_SETTINGS_KEY);
  if (!raw) return DEFAULT_ALARM_SETTINGS;
  try {
    return { ...DEFAULT_ALARM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ALARM_SETTINGS;
  }
}

export function saveStoredAlarmSettings(settings: AlarmSettings): void {
  safeSetItem(ALARM_SETTINGS_KEY, JSON.stringify(settings));
}
