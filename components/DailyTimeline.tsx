'use client';

import React, { useState } from 'react';
import {
  Camera,
  Sun,
  Sunset,
  Moon,
  Bell,
} from 'lucide-react';
import { Medication, IntakeLog, TimeBucket, IntakeStatus } from '@/types/medication';
import { playSuccessChime, triggerHapticFeedback, testAlarmNotification } from '@/lib/notification';
import { getLocalDateString } from '@/lib/storage';
import SwipeableMedCard from '@/components/SwipeableMedCard';

interface DailyTimelineProps {
  medications: Medication[];
  logs: IntakeLog[];
  onUpdateStatus: (
    medicationId: string,
    timeBucket: TimeBucket,
    status: IntakeStatus,
    targetDate?: string
  ) => void;
  onOpenScanner: () => void;
  streakCount: number;
}

export default function DailyTimeline({
  medications,
  logs,
  onUpdateStatus,
  onOpenScanner,
  streakCount,
}: DailyTimelineProps) {
  const [alarmFeedback, setAlarmFeedback] = useState<string | null>(null);

  const todayIso = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIso);

  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    const iso = getLocalDateString(d);
    return {
      iso,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: iso === todayIso,
    };
  });

  const timeBuckets: { key: TimeBucket; title: string; time: string; icon: React.ReactNode }[] = [
    { key: 'morning', title: 'Morning', time: '8:00 AM', icon: <Sun className="w-5 h-5 text-amber-500" /> },
    { key: 'afternoon', title: 'Afternoon', time: '1:00 PM', icon: <Sun className="w-5 h-5 text-orange-500" /> },
    { key: 'evening', title: 'Evening', time: '7:00 PM', icon: <Sunset className="w-5 h-5 text-indigo-500" /> },
    { key: 'night', title: 'Night', time: '10:00 PM', icon: <Moon className="w-5 h-5 text-blue-500" /> },
  ];

  const getIntakeStatus = (medId: string, bucket: TimeBucket): IntakeStatus => {
    const match = logs.find(
      (l) => l.medicationId === medId && l.timeBucket === bucket && l.date === selectedDate
    );
    return match ? match.status : 'pending';
  };

  const handleTake = (medId: string, bucket: TimeBucket) => {
    playSuccessChime();
    triggerHapticFeedback();
    onUpdateStatus(medId, bucket, 'taken', selectedDate);
  };

  let totalScheduled = 0;
  let takenCount = 0;
  timeBuckets.forEach((bucket) => {
    const medsForBucket = medications.filter((m) => m.timing.includes(bucket.key));
    totalScheduled += medsForBucket.length;
    medsForBucket.forEach((m) => {
      if (getIntakeStatus(m.id, bucket.key) === 'taken') {
        takenCount++;
      }
    });
  });

  const allTaken = totalScheduled > 0 && takenCount === totalScheduled;

  return (
    <div className="space-y-4 pb-24 text-gray-900">
      {/* Friendly Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Medication Reminder
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Today&apos;s Pills
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Test Alarm Button */}
          <button
            onClick={async () => {
              const msg = await testAlarmNotification();
              setAlarmFeedback(msg);
              setTimeout(() => setAlarmFeedback(null), 4000);
            }}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-full flex items-center space-x-1 text-xs font-bold transition-colors active:scale-95 shadow-sm"
            title="Test alarm sound, vibration, and notification"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
            <span>Test Alarm</span>
          </button>

          {/* Streak Counter */}
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-sm">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold text-amber-800">{streakCount} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Alarm Feedback Toast */}
      {alarmFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span className="flex items-center space-x-2">
            <span>🔔</span>
            <span>{alarmFeedback}</span>
          </span>
          <button onClick={() => setAlarmFeedback(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Week Calendar Row */}
      <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
        {dates.map((d) => {
          const isSelected = selectedDate === d.iso;
          return (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`flex-1 min-w-[48px] py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20 scale-105'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-[11px] font-medium">{d.dayName}</span>
              <span className="text-base font-extrabold mt-0.5">{d.dayNumber}</span>
              {d.isToday && (
                <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress Card */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 card-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            {allTaken ? '🎉 All done for today!' : `${takenCount} of ${totalScheduled} pills taken`}
          </span>
          <span className="text-xs font-bold text-blue-600">
            {totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${totalScheduled > 0 ? (takenCount / totalScheduled) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Quick Scan Prescription Callout */}
      <button
        onClick={onOpenScanner}
        className="w-full p-3.5 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-between text-left group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-950">Got a new prescription?</h4>
            <p className="text-xs text-blue-700">Take a photo and AI will set reminders</p>
          </div>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
          Scan Now →
        </span>
      </button>

      {/* Friendly Gesture Hint */}
      <div className="flex items-center justify-between px-2 py-0.5 text-xs text-gray-500 font-medium select-none">
        <span className="flex items-center space-x-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Tip: Slide any card left/right to mark as taken</span>
        </span>
        <span className="text-gray-400 text-[11px]">or tap &quot;I Took This&quot;</span>
      </div>

      {/* Daily Routine Sections */}
      <div className="space-y-4 pt-1">
        {timeBuckets.map((bucket) => {
          const medsInBucket = medications.filter((m) => m.timing.includes(bucket.key));

          return (
            <div key={bucket.key} className="space-y-2.5">
              {/* Section Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  {bucket.icon}
                  <h3 className="text-base font-bold text-gray-900">{bucket.title}</h3>
                  <span className="text-xs text-gray-500 font-medium">• {bucket.time}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {medsInBucket.length} {medsInBucket.length === 1 ? 'pill' : 'pills'}
                </span>
              </div>

              {/* Medication Cards */}
              {medsInBucket.length === 0 ? (
                <div className="py-3 px-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-400 text-center">
                  No pills scheduled for {bucket.title.toLowerCase()}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {medsInBucket.map((med) => {
                    const status = getIntakeStatus(med.id, bucket.key);

                    return (
                      <SwipeableMedCard
                        key={med.id}
                        med={med}
                        bucketKey={bucket.key}
                        status={status}
                        onTake={() => handleTake(med.id, bucket.key)}
                        onSnooze={() => onUpdateStatus(med.id, bucket.key, 'snoozed', selectedDate)}
                        onSkip={() => onUpdateStatus(med.id, bucket.key, 'skipped', selectedDate)}
                        onUndo={() => onUpdateStatus(med.id, bucket.key, 'pending', selectedDate)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
