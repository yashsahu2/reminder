'use client';

import React, { useState } from 'react';
import { Check, X, AlertTriangle, Trash2 } from 'lucide-react';
import { PrescriptionAnalysisResult, Medication, TimeBucket } from '@/types/medication';
import { playSuccessChime, triggerHapticFeedback } from '@/lib/notification';
import { getLocalDateString } from '@/lib/storage';

interface MedicationReviewModalProps {
  isOpen: boolean;
  result: PrescriptionAnalysisResult | null;
  onClose: () => void;
  onConfirmSchedule: (meds: Medication[]) => void;
}

export default function MedicationReviewModal({
  isOpen,
  result,
  onClose,
  onConfirmSchedule,
}: MedicationReviewModalProps) {
  const [editableMeds, setEditableMeds] = useState<
    Omit<Medication, 'id' | 'startDate' | 'remainingCount' | 'totalCount'>[]
  >(result?.medications || []);

  React.useEffect(() => {
    if (result?.medications) {
      setEditableMeds(result.medications);
    }
  }, [result]);

  if (!isOpen || !result) return null;

  const toggleTiming = (index: number, bucket: TimeBucket) => {
    const updated = [...editableMeds];
    const current = updated[index].timing;
    if (current.includes(bucket)) {
      if (current.length > 1) {
        updated[index].timing = current.filter((t) => t !== bucket);
      }
    } else {
      updated[index].timing = [...current, bucket];
    }
    setEditableMeds(updated);
  };

  const removeMedication = (index: number) => {
    setEditableMeds(editableMeds.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (editableMeds.length === 0) return;

    triggerHapticFeedback();
    playSuccessChime();

    const todayStr = getLocalDateString();

    const finalizedMeds: Medication[] = editableMeds.map((med, idx) => ({
      ...med,
      id: `med-${Date.now()}-${idx}`,
      startDate: todayStr,
      defaultTimes: med.defaultTimes && med.defaultTimes.length > 0 ? med.defaultTimes : ['08:00', '20:00'],
      totalCount: (med.durationDays || 7) * (med.timing?.length || 1),
      remainingCount: (med.durationDays || 7) * (med.timing?.length || 1),
    }));

    onConfirmSchedule(finalizedMeds);
    onClose();
  };

  const timeBucketLabels: { key: TimeBucket; label: string }[] = [
    { key: 'morning', label: '🌅 Morning' },
    { key: 'afternoon', label: '☀️ Afternoon' },
    { key: 'evening', label: '🌆 Evening' },
    { key: 'night', label: '🌙 Night' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Check Your Medicines
            </h2>
            <p className="text-xs text-gray-500">
              Gemini found {editableMeds.length} medicines on your prescription
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Medicines */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3.5 bg-gray-50/50">
          {/* Doctor Note */}
          {result.doctorName && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
              <span className="font-semibold">Doctor: {result.doctorName}</span>
              {result.clinicName && <span className="text-blue-700">{result.clinicName}</span>}
            </div>
          )}

          {/* Interaction Notice */}
          {result.potentialInteractions && result.potentialInteractions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Important Safety Note:</span>
              </div>
              {result.potentialInteractions.map((note, i) => (
                <p key={i} className="text-amber-800 pl-5 text-xs">
                  • {note}
                </p>
              ))}
            </div>
          )}

          {/* Pill Cards */}
          <div className="space-y-3">
            {editableMeds.map((med, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2.5 card-shadow relative"
              >
                <button
                  onClick={() => removeMedication(idx)}
                  className="absolute top-3.5 right-3.5 text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Remove this medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="pr-8">
                  <h4 className="text-base font-bold text-gray-900">{med.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Dosage: <span className="text-gray-900 font-bold">{med.dosage}</span> •{' '}
                    <span className="capitalize">{med.relationToMeal?.replace('_', ' ')}</span>
                  </p>
                </div>

                {/* Timing Toggles */}
                <div>
                  <span className="text-xs font-semibold text-gray-500 block mb-1.5">
                    Remind me at:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {timeBucketLabels.map((bucket) => {
                      const isSelected = med.timing?.includes(bucket.key);
                      return (
                        <button
                          key={bucket.key}
                          onClick={() => toggleTiming(idx, bucket.key)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span>{bucket.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {med.instructions && (
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg italic">
                    Tip: {med.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-gray-100 bg-white flex space-x-3 pb-safe">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={editableMeds.length === 0}
            className={`flex-1 py-3 px-5 rounded-xl text-white text-sm font-bold shadow-md active:scale-98 transition-all flex items-center justify-center space-x-2 ${
              editableMeds.length === 0
                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{editableMeds.length === 0 ? 'No Medicines Left' : 'Looks Good, Set Reminders!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
