'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { TabType } from '@/components/Navbar';
import DailyTimeline from '@/components/DailyTimeline';
import PrescriptionScanner from '@/components/PrescriptionScanner';
import MedicationReviewModal from '@/components/MedicationReviewModal';
import MedicineCabinet from '@/components/MedicineCabinet';
import AdherenceView from '@/components/AdherenceView';
import {
  Medication,
  IntakeLog,
  StoredPrescription,
  PrescriptionAnalysisResult,
  TimeBucket,
  IntakeStatus,
} from '@/types/medication';
import {
  getStoredMedications,
  saveStoredMedications,
  getStoredLogs,
  saveStoredLogs,
  getStoredPrescriptions,
  saveStoredPrescriptions,
  getStreakCount,
  setStreakCount,
  getLocalDateString,
} from '@/lib/storage';
import {
  requestNotificationPermission,
  initNotificationEngine,
  scheduleMedicationAlarms,
  cancelMedicationAlarms,
  cancelSingleAlarm,
  scheduleSnoozeAlarm,
} from '@/lib/notification';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [prescriptions, setPrescriptions] = useState<StoredPrescription[]>([]);
  const [streakCount, setStreak] = useState<number>(5);

  // Scanner & Review Modal states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [scannedResult, setScannedResult] = useState<PrescriptionAnalysisResult | null>(null);

  // Load initial data from local storage and initialize native alarms
  useEffect(() => {
    const meds = getStoredMedications();
    setMedications(meds);
    setLogs(getStoredLogs());
    setPrescriptions(getStoredPrescriptions());
    setStreak(getStreakCount());

    // Initialize native Android notification channels and action listeners
    initNotificationEngine((actionId, notification) => {
      const medId = notification?.extra?.medicationId;
      const bucket = notification?.extra?.timeBucket;
      if (medId && bucket) {
        if (actionId === 'TAKE') {
          handleUpdateStatus(medId, bucket, 'taken');
        } else if (actionId === 'SNOOZE') {
          handleUpdateStatus(medId, bucket, 'snoozed');
        }
      }
    });

    // Request permissions and schedule daily alarms
    requestNotificationPermission().then((granted) => {
      if (granted && meds.length > 0) {
        scheduleMedicationAlarms(meds);
      }
    }).catch(() => {});
  }, []);

  const handleUpdateStatus = (
    medicationId: string,
    timeBucket: TimeBucket,
    status: IntakeStatus,
    targetDate?: string
  ) => {
    const logDate = targetDate || new Date().toISOString().split('T')[0];

    // Check existing status in current logs to know if we are transitioning
    const existingLog = logs.find(
      (l) => l.medicationId === medicationId && l.timeBucket === timeBucket && l.date === logDate
    );
    const previousStatus: IntakeStatus = existingLog ? existingLog.status : 'pending';

    // If status didn't change, do nothing
    if (previousStatus === status) return;

    // 1. Update intake logs
    setLogs((prevLogs) => {
      const existingIndex = prevLogs.findIndex(
        (l) => l.medicationId === medicationId && l.timeBucket === timeBucket && l.date === logDate
      );

      let updatedLogs: IntakeLog[];
      if (existingIndex >= 0) {
        updatedLogs = [...prevLogs];
        updatedLogs[existingIndex] = {
          ...updatedLogs[existingIndex],
          status,
          loggedAt: new Date().toISOString(),
        };
      } else {
        const newLog: IntakeLog = {
          id: `log-${Date.now()}`,
          medicationId,
          date: logDate,
          timeBucket,
          scheduledTime: '08:00',
          status,
          loggedAt: new Date().toISOString(),
        };
        updatedLogs = [newLog, ...prevLogs];
      }

      saveStoredLogs(updatedLogs);
      return updatedLogs;
    });

    // 2. Adjust remainingCount and manage background alarms
    // When changing from not-taken -> taken: decrement 1 pill and cancel today's alarm
    if (previousStatus !== 'taken' && status === 'taken') {
      cancelSingleAlarm(medicationId, timeBucket);
      setMedications((prevMeds) => {
        const updated = prevMeds.map((m) => {
          if (m.id === medicationId && m.remainingCount > 0) {
            return { ...m, remainingCount: m.remainingCount - 1 };
          }
          return m;
        });
        saveStoredMedications(updated);
        return updated;
      });
    }

    // When snoozed: schedule 15-minute exact snooze alarm
    if (status === 'snoozed') {
      const medToSnooze = medications.find((m) => m.id === medicationId);
      if (medToSnooze) {
        scheduleSnoozeAlarm(medToSnooze, timeBucket, 15);
      }
    }

    // When changing from taken -> not-taken (Undo, skipped, snoozed, pending): restore 1 pill
    if (previousStatus === 'taken' && status !== 'taken') {
      setMedications((prevMeds) => {
        const updated = prevMeds.map((m) => {
          if (m.id === medicationId) {
            return { ...m, remainingCount: m.remainingCount + 1 };
          }
          return m;
        });
        saveStoredMedications(updated);
        return updated;
      });
    }
  };

  const handleAnalysisComplete = (result: PrescriptionAnalysisResult, previewUrl: string) => {
    setScannedResult(result);
    setIsReviewOpen(true);

    // Save prescription archive
    const newScript: StoredPrescription = {
      id: `rx-${Date.now()}`,
      uploadedAt: new Date().toLocaleDateString(),
      imageUrl: previewUrl,
      doctorName: result.doctorName,
      clinicName: result.clinicName,
      diagnosis: result.diagnosis,
      medicationCount: result.medications.length,
    };

    setPrescriptions((prev) => {
      const updated = [newScript, ...prev];
      saveStoredPrescriptions(updated);
      return updated;
    });
  };

  const handleConfirmSchedule = (newMeds: Medication[]) => {
    setMedications((prev) => {
      const updated = [...newMeds, ...prev];
      saveStoredMedications(updated);
      // Schedule background alarms for all active medications
      scheduleMedicationAlarms(updated);
      return updated;
    });

    // Boost streak
    const newStreak = streakCount + 1;
    setStreak(newStreak);
    setStreakCount(newStreak);

    // Switch to Today tab to see newly scheduled medications
    setCurrentTab('today');
  };

  const handleRefill = (medId: string, addedCount: number) => {
    setMedications((prev) => {
      const updated = prev.map((m) => {
        if (m.id === medId) {
          return {
            ...m,
            remainingCount: m.remainingCount + addedCount,
            totalCount: (m.totalCount || 10) + addedCount,
          };
        }
        return m;
      });
      saveStoredMedications(updated);
      return updated;
    });
  };

  const handleDeleteMed = (medId: string) => {
    setMedications((prev) => {
      const updated = prev.filter((m) => m.id !== medId);
      saveStoredMedications(updated);
      // Cancel background alarms for deleted medication
      cancelMedicationAlarms(medId);
      return updated;
    });
  };

  // Pending count for navbar badge using local date
  const today = getLocalDateString();
  const pendingCount = medications.reduce((acc, med) => {
    const pendingForMed = med.timing.filter(
      (bucket) =>
        !logs.some(
          (l) =>
            l.medicationId === med.id &&
            l.timeBucket === bucket &&
            l.date === today &&
            l.status === 'taken'
        )
    ).length;
    return acc + pendingForMed;
  }, 0);

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-gray-900 relative flex justify-center selection:bg-blue-600 selection:text-white">

      {/* Mobile-first Frame Container */}
      <div className="w-full max-w-md min-h-screen px-4 pt-safe relative z-10 flex flex-col">
        {/* Active Tab Screen */}
        <div className="flex-1">
          {currentTab === 'today' && (
            <DailyTimeline
              medications={medications}
              logs={logs}
              onUpdateStatus={handleUpdateStatus}
              onOpenScanner={() => setIsScannerOpen(true)}
              streakCount={streakCount}
            />
          )}

          {currentTab === 'cabinet' && (
            <MedicineCabinet
              medications={medications}
              prescriptions={prescriptions}
              onRefill={handleRefill}
              onDeleteMed={handleDeleteMed}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          )}

          {currentTab === 'adherence' && (
            <AdherenceView
              logs={logs}
              medications={medications}
              streakCount={streakCount}
            />
          )}
        </div>

        {/* Prescription Scanner Modal Overlay */}
        <PrescriptionScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />

        {/* Extracted Medication Review Modal */}
        <MedicationReviewModal
          isOpen={isReviewOpen}
          result={scannedResult}
          onClose={() => setIsReviewOpen(false)}
          onConfirmSchedule={handleConfirmSchedule}
        />

        {/* Bottom Mobile Navigation Dock */}
        <Navbar
          currentTab={currentTab}
          onChangeTab={(tab) => {
            if (tab === 'scan') {
              setIsScannerOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          pendingCount={pendingCount}
        />
      </div>
    </main>
  );
}
