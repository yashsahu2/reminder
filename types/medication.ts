export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export type IntakeStatus = 'pending' | 'taken' | 'snoozed' | 'skipped';

export interface Medication {
  id: string;
  prescriptionId?: string;
  name: string;
  genericName?: string;
  dosage: string; // e.g. "500 mg", "10 ml"
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'drops' | 'inhaler' | 'cream' | 'other';
  frequency: string; // e.g. "Twice daily", "Every 8 hours", "1-0-1"
  timing: TimeBucket[]; // ['morning', 'night']
  defaultTimes: string[]; // ['08:00', '20:00']
  relationToMeal: 'before_meal' | 'after_meal' | 'with_meal' | 'anytime';
  durationDays?: number; // e.g. 5 days, 30 days
  startDate: string; // ISO date
  endDate?: string;
  remainingCount: number; // For refill reminders
  totalCount: number;
  instructions?: string; // e.g. "Drink full glass of water"
  warning?: string; // e.g. "May cause drowsiness"
  colorTag?: string; // for UI chip
}

export interface IntakeLog {
  id: string;
  medicationId: string;
  date: string; // YYYY-MM-DD (local calendar date)
  timeBucket: TimeBucket;
  scheduledTime: string; // HH:mm
  status: IntakeStatus;
  loggedAt?: string; // ISO timestamp
}

export interface PrescriptionAnalysisResult {
  doctorName?: string;
  clinicName?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  patientAdvice?: string[];
  potentialInteractions?: string[];
  medications: Omit<Medication, 'id' | 'startDate' | 'remainingCount' | 'totalCount'>[];
  rawTextConfidence?: number;
}

export interface StoredPrescription {
  id: string;
  uploadedAt: string;
  imageUrl?: string;
  doctorName?: string;
  clinicName?: string;
  diagnosis?: string;
  medicationCount: number;
}

export interface AlarmSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  exactAlarmsEnabled: boolean;
  morningTime: string;   // "08:00"
  afternoonTime: string; // "13:00"
  eveningTime: string;   // "19:00"
  nightTime: string;     // "22:00"
}
