'use client';

import React from 'react';
import { Check, Flame, Trophy, ShieldCheck, HeartPulse } from 'lucide-react';
import { IntakeLog, Medication } from '@/types/medication';

import { getLocalDateString } from '@/lib/storage';

interface AdherenceViewProps {
  logs: IntakeLog[];
  medications: Medication[];
  streakCount: number;
}

export default function AdherenceView({ logs, streakCount }: AdherenceViewProps) {
  const totalTaken = logs.filter((l) => l.status === 'taken').length;
  const totalScheduled = logs.length;
  // Accurate score: If no logs recorded yet, default to 100%, otherwise compute exact percentage
  const complianceRate =
    totalScheduled > 0 ? Math.min(100, Math.round((totalTaken / totalScheduled) * 100)) : 100;

  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const iso = getLocalDateString(d);
    const takenOnDay = logs.filter((l) => l.date === iso && l.status === 'taken').length;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      iso,
      completed: takenOnDay > 0,
    };
  });

  return (
    <div className="space-y-4 pb-24 text-gray-900">
      {/* Header */}
      <div className="pt-2 px-1">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          Health Insights
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Your Progress
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          See how consistently you&apos;ve been taking your medicine
        </p>
      </div>

      {/* Main Score Card */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 card-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-gray-900">{complianceRate}%</span>
              <span className="text-sm font-semibold text-emerald-600">On Time</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Overall medicine score
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end space-x-1">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-2xl font-black text-amber-600">{streakCount} Days</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Current daily streak
            </p>
          </div>
        </div>

        {/* 7-Day Checklist */}
        <div>
          <span className="text-xs font-bold text-gray-700 block mb-2">
            This Week&apos;s Checklist
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {past7Days.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                    item.completed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {item.completed ? <Check className="w-4 h-4 stroke-[3]" /> : item.date}
                </div>
                <span className="text-[11px] text-gray-500 mt-1 font-medium">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Encouragement Cards */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide px-1">
          Helpful Tips
        </h3>

        <div className="space-y-2">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 card-shadow flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Finish Your Full Antibiotic Course
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Even if you start feeling 100% better, finish all days of your antibiotic so the infection doesn&apos;t return.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-200 card-shadow flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                You&apos;re in the Top 10%
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Taking your doses within 30 minutes of your reminder gives your body the best recovery chance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
