'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Calendar, FileText, AlertCircle, Pill, Camera } from 'lucide-react';
import { Medication, StoredPrescription } from '@/types/medication';

interface MedicineCabinetProps {
  medications: Medication[];
  prescriptions: StoredPrescription[];
  onRefill: (medId: string, addedCount: number) => void;
  onDeleteMed: (medId: string) => void;
  onOpenScanner: () => void;
}

export default function MedicineCabinet({
  medications,
  prescriptions,
  onRefill,
  onDeleteMed,
  onOpenScanner,
}: MedicineCabinetProps) {
  const [activeTab, setActiveTab] = useState<'medicines' | 'prescriptions'>('medicines');

  const lowStockMeds = medications.filter((m) => m.remainingCount <= 3);

  return (
    <div className="space-y-4 pb-24 text-gray-900">
      {/* Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Your Supplies
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            My Pills
          </h1>
        </div>
        <button
          onClick={onOpenScanner}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Rx</span>
        </button>
      </div>

      {/* Segmented Switcher */}
      <div className="flex p-1 rounded-xl bg-gray-200/80">
        <button
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'medicines'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Medicines ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'prescriptions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Prescriptions ({prescriptions.length})
        </button>
      </div>

      {/* Refill Needed Alert */}
      {lowStockMeds.length > 0 && activeTab === 'medicines' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900">Refill Needed Soon</h4>
            <p className="text-amber-800 mt-0.5">
              You have {lowStockMeds.length} medicine{lowStockMeds.length === 1 ? '' : 's'} with 3 or fewer pills left. Tap refill when you pick up your fresh box.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {activeTab === 'medicines' ? (
        <div className="space-y-3">
          {medications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs bg-white rounded-2xl border border-gray-200 p-6">
              You don&apos;t have any pills added yet. Tap &apos;Scan Rx&apos; to take a picture of your prescription.
            </div>
          ) : (
            medications.map((med) => {
              const percentLeft = Math.min(
                100,
                Math.round((med.remainingCount / (med.totalCount || 10)) * 100)
              );

              return (
                <div
                  key={med.id}
                  className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 card-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">{med.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">
                          {med.genericName ? `${med.genericName} • ` : ''}
                          <span className="text-gray-800 font-bold">{med.dosage}</span>
                        </p>
                        <div className="flex items-center space-x-1.5 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Started on {med.startDate}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${med.name} from your active medicines? Alarms for this pill will also be cancelled.`
                          )
                        ) {
                          onDeleteMed(med.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock Level */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">Pills Remaining:</span>
                      <span className={`font-bold ${med.remainingCount <= 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {med.remainingCount} of {med.totalCount || 10} left ({percentLeft}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          med.remainingCount <= 3 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                  </div>

                  {/* Refill Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onRefill(med.id, 10)}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Got Refill (+10 Pills)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Prescriptions Tab */
        <div className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs bg-white rounded-2xl border border-gray-200 p-6">
              No saved prescription photos yet.
            </div>
          ) : (
            prescriptions.map((script) => (
              <div
                key={script.id}
                className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between card-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {script.doctorName || 'Prescription Slip'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {script.clinicName || 'Clinic'} • {script.medicationCount} medicines
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Uploaded on {script.uploadedAt}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
