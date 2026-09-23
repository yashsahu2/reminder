// Client-side notification, alarm, and haptics engine for native mobile (Capacitor) & web fallback

import { Medication, TimeBucket, AlarmSettings } from '@/types/medication';

let activeAlarmAudioCtx: AudioContext | null = null;
let activeAlarmTimer: NodeJS.Timeout | null = null;

/**
 * Request notification permissions (Capacitor native first, web second).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === 'granted') return true;
  } catch {
    // fallback to web
  }

  if ('Notification' in window) {
    try {
      const status = await Notification.requestPermission();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Initializes native Android notification channels and action buttons.
 */
export async function initNotificationEngine(
  onAction?: (actionId: string, notification: any) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // 1. Create Android 8+ High-Priority Alarm Channel
    await LocalNotifications.createChannel({
      id: 'medication_alarms',
      name: 'Medication Alarms & Reminders',
      description: 'Loud high-priority alarm reminders for your scheduled pill doses',
      importance: 5, // MAX / heads-up notification banner
      visibility: 1, // public on lockscreen
      sound: 'beep.wav',
      vibration: true,
      lights: true,
      lightColor: '#2563EB',
    });

    // 2. Register Interactive Action Types (I Took This & Snooze)
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'MED_ALARM_ACTIONS',
          actions: [
            { id: 'TAKE', title: '✓ I Took This' },
            { id: 'SNOOZE', title: '⏱ Snooze 15m' },
          ],
        },
      ],
    });

    // 3. Listen for notification action taps
    if (onAction) {
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          onAction(action.actionId, action.notification);
        }
      );
    }
  } catch (err) {
    console.warn('Native notification engine initialization not available (running in browser):', err);
  }
}

/**
 * Hash a medicationId + bucket into a stable 32-bit positive integer ID for Capacitor.
 */
export function getNotificationId(medicationId: string, bucket: TimeBucket): number {
  const str = `${medicationId}-${bucket}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647);
}

const DEFAULT_BUCKET_TIMES: Record<TimeBucket, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 19, minute: 0 },
  night: { hour: 22, minute: 0 },
};

function parseTimeToHourMinute(timeStr: string, fallback: { hour: number; minute: number }) {
  if (!timeStr || !timeStr.includes(':')) return fallback;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
  if (isNaN(h) || isNaN(m)) return fallback;
  return { hour: h, minute: m };
}

/**
 * Schedule daily repeating alarms for all active medications.
 */
export async function scheduleMedicationAlarms(
  medications: Medication[],
  settings?: AlarmSettings
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // Gather all notifications to schedule
    const notificationsToSchedule: any[] = [];

    const bucketTimes = {
      morning: parseTimeToHourMinute(settings?.morningTime || '08:00', DEFAULT_BUCKET_TIMES.morning),
      afternoon: parseTimeToHourMinute(settings?.afternoonTime || '13:00', DEFAULT_BUCKET_TIMES.afternoon),
      evening: parseTimeToHourMinute(settings?.eveningTime || '19:00', DEFAULT_BUCKET_TIMES.evening),
      night: parseTimeToHourMinute(settings?.nightTime || '22:00', DEFAULT_BUCKET_TIMES.night),
    };

    for (const med of medications) {
      if (med.remainingCount <= 0) continue; // skip depleted meds

      for (const bucket of med.timing) {
        const id = getNotificationId(med.id, bucket);
        const time = bucketTimes[bucket] || DEFAULT_BUCKET_TIMES[bucket];
        const mealNote = med.relationToMeal ? med.relationToMeal.replace('_', ' ') : 'as directed';

        notificationsToSchedule.push({
          id,
          title: `💊 Time to take ${med.name}`,
          body: `Dose: ${med.dosage} (${mealNote}). Tap to confirm or slide in app!`,
          channelId: 'medication_alarms',
          actionTypeId: 'MED_ALARM_ACTIONS',
          extra: {
            medicationId: med.id,
            timeBucket: bucket,
          },
          schedule: {
            on: {
              hour: time.hour,
              minute: time.minute,
            },
            repeats: true,
            every: 'day',
            allowWhileIdle: true, // Fire even in Android battery saver / doze mode
          },
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      console.log(`Successfully scheduled ${notificationsToSchedule.length} daily medication alarms`);
    }
  } catch (err) {
    console.warn('Native alarm scheduling unavailable (web fallback):', err);
  }
}

/**
 * Cancel alarms for a deleted or completed medication.
 */
export async function cancelMedicationAlarms(medicationId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const buckets: TimeBucket[] = ['morning', 'afternoon', 'evening', 'night'];
    const idsToCancel = buckets.map((b) => ({ id: getNotificationId(medicationId, b) }));
    await LocalNotifications.cancel({ notifications: idsToCancel });
  } catch {
    // ignore in browser
  }
}

/**
 * Cancel a specific single time-bucket alarm (e.g. dose taken early).
 */
export async function cancelSingleAlarm(medicationId: string, bucket: TimeBucket): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({
      notifications: [{ id: getNotificationId(medicationId, bucket) }],
    });
  } catch {
    // ignore in browser
  }
}

/**
 * Schedule a 15-minute snooze alarm for a medication.
 */
export async function scheduleSnoozeAlarm(
  medication: Medication,
  bucket: TimeBucket,
  minutes = 15
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
    const snoozeId = (getNotificationId(medication.id, bucket) + 9999) % 2147483647;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: snoozeId,
          title: `⏰ Snooze Reminder: ${medication.name}`,
          body: `You snoozed this dose 15 mins ago. Time to take ${medication.dosage}!`,
          channelId: 'medication_alarms',
          actionTypeId: 'MED_ALARM_ACTIONS',
          extra: {
            medicationId: medication.id,
            timeBucket: bucket,
          },
          schedule: {
            at: snoozeDate,
            allowWhileIdle: true,
          },
        },
      ],
    });
  } catch {
    // ignore in browser
  }
}

/**
 * Synthesizes an attention-grabbing medical chime alarm sequence via Web Audio API.
 */
export function playAlarmAudio(): void {
  if (typeof window === 'undefined') return;
  stopAlarmAudio(); // stop any existing chime

  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    activeAlarmAudioCtx = ctx;

    const playPulse = () => {
      if (!activeAlarmAudioCtx || activeAlarmAudioCtx.state === 'closed') return;
      const now = ctx.currentTime;
      const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 medical triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.18, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.3);
      });
    };

    playPulse();
    activeAlarmTimer = setInterval(playPulse, 1200);

    // Auto-stop after 25 seconds to prevent battery drain
    setTimeout(() => {
      stopAlarmAudio();
    }, 25000);
  } catch (err) {
    console.warn('Web Audio alarm playback not permitted yet (requires user gesture):', err);
  }
}

/**
 * Stops any actively sounding alarm audio chime.
 */
export function stopAlarmAudio(): void {
  if (activeAlarmTimer) {
    clearInterval(activeAlarmTimer);
    activeAlarmTimer = null;
  }
  if (activeAlarmAudioCtx) {
    try {
      activeAlarmAudioCtx.close();
    } catch {
      // ignore
    }
    activeAlarmAudioCtx = null;
  }
}

/**
 * Plays a single calm success chime when a pill is taken.
 */
export function playSuccessChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Triggers native haptic feedback.
 */
export async function triggerHapticFeedback(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
    return;
  } catch {
    // fallback
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {
      // ignore
    }
  }
}

/**
 * Test Alarm & Notifications:
 * Plays alarm audio for 3.5s, vibrates, and fires a native or web notification immediately.
 */
export async function testAlarmNotification(): Promise<string> {
  triggerHapticFeedback();
  playAlarmAudio();
  setTimeout(() => stopAlarmAudio(), 3500);

  let message = 'Alarm chime played and haptics triggered!';

  // Try Capacitor Local Notification test
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999999,
          title: '🔔 MyMedies Alarm Test',
          body: 'Your alarm sound, vibration, and reminders are working perfectly!',
          channelId: 'medication_alarms',
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
    return 'Native alarm notification scheduled & sound tested!';
  } catch {
    // Browser fallback
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('🔔 MyMedies Alarm Test', {
        body: 'Your alarm sound and reminders are working properly!',
      });
      message = 'Web notification sent & alarm sound tested!';
    } catch {
      // ignore
    }
  }

  return message;
}
