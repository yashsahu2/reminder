'use client';

import React from 'react';
import { Calendar, Camera, Pill, Award } from 'lucide-react';

export type TabType = 'today' | 'scan' | 'cabinet' | 'adherence';

interface NavbarProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingCount?: number;
}

export default function Navbar({ currentTab, onChangeTab, pendingCount = 0 }: NavbarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Today Tab */}
        <button
          onClick={() => onChangeTab('today')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'today' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <div className="relative">
            <Calendar className={`w-5 h-5 ${currentTab === 'today' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Today</span>
        </button>

        {/* Scan Rx Button */}
        <button
          onClick={() => onChangeTab('scan')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'scan' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-0.5">
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold text-blue-600">Scan Rx</span>
        </button>

        {/* My Pills Tab */}
        <button
          onClick={() => onChangeTab('cabinet')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'cabinet' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Pill className={`w-5 h-5 ${currentTab === 'cabinet' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-xs mt-1">My Pills</span>
        </button>

        {/* Progress Tab */}
        <button
          onClick={() => onChangeTab('adherence')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'adherence' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Award className={`w-5 h-5 ${currentTab === 'adherence' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-xs mt-1">Progress</span>
        </button>
      </div>
    </nav>
  );
}
