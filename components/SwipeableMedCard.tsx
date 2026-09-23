'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, RotateCcw, AlertCircle, Pill, ArrowRight, ArrowLeft } from 'lucide-react';
import { Medication, TimeBucket, IntakeStatus } from '@/types/medication';
import { triggerHapticFeedback } from '@/lib/notification';

interface SwipeableMedCardProps {
  med: Medication;
  bucketKey: TimeBucket;
  status: IntakeStatus;
  onTake: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onUndo: () => void;
}

const THRESHOLD = 85; // pixels dragged to trigger take

export default function SwipeableMedCard({
  med,
  bucketKey,
  status,
  onTake,
  onSnooze,
  onSkip,
  onUndo,
}: SwipeableMedCardProps) {
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isActionTriggered, setIsActionTriggered] = useState<boolean>(false);

  // Refs for tracking drag state without re-render lag
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const directionDecidedRef = useRef<boolean>(false);
  const isVerticalScrollRef = useRef<boolean>(false);
  const hasTriggeredHapticRef = useRef<boolean>(false);

  // Reset when status changes
  useEffect(() => {
    setOffsetX(0);
    currentOffsetRef.current = 0;
    setIsDragging(false);
    isDraggingRef.current = false;
    setIsActionTriggered(false);
  }, [status]);

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (status === 'taken' || status === 'skipped') return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentOffsetRef.current = 0;
    isDraggingRef.current = true;
    directionDecidedRef.current = false;
    isVerticalScrollRef.current = false;
    hasTriggeredHapticRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Detect if this is a vertical page scroll vs horizontal card swipe
    if (!directionDecidedRef.current) {
      if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX)) {
        isVerticalScrollRef.current = true;
        directionDecidedRef.current = true;
        isDraggingRef.current = false;
        setIsDragging(false);
        setOffsetX(0);
        return;
      } else if (Math.abs(diffX) > 8) {
        directionDecidedRef.current = true;
        isVerticalScrollRef.current = false;
      } else {
        return;
      }
    }

    if (isVerticalScrollRef.current) return;

    // Apply smooth resistance damping past threshold
    let dampedOffset = diffX;
    if (Math.abs(dampedOffset) > 110) {
      const sign = Math.sign(dampedOffset);
      dampedOffset = sign * (110 + Math.sqrt(Math.abs(dampedOffset) - 110) * 8);
    }

    currentOffsetRef.current = dampedOffset;
    setOffsetX(dampedOffset);

    // Haptic tick when user crosses threshold
    if (Math.abs(dampedOffset) >= THRESHOLD && !hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = true;
      triggerHapticFeedback();
    } else if (Math.abs(dampedOffset) < THRESHOLD) {
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || isVerticalScrollRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setOffsetX(0);
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    if (Math.abs(currentOffsetRef.current) >= THRESHOLD) {
      setIsActionTriggered(true);
      // Brief animation before triggering action
      setOffsetX(Math.sign(currentOffsetRef.current) * 350);
      setTimeout(() => {
        onTake();
        setOffsetX(0);
        setIsActionTriggered(false);
      }, 180);
    } else {
      setOffsetX(0);
      currentOffsetRef.current = 0;
    }
  };

  // Mouse drag support for desktop/browser testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (status === 'taken' || status === 'skipped') return;
    if (e.button !== 0) return; // only left-click
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    startXRef.current = e.clientX;
    currentOffsetRef.current = 0;
    isDraggingRef.current = true;
    hasTriggeredHapticRef.current = false;
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const diffX = moveEvent.clientX - startXRef.current;

      let dampedOffset = diffX;
      if (Math.abs(dampedOffset) > 110) {
        const sign = Math.sign(dampedOffset);
        dampedOffset = sign * (110 + Math.sqrt(Math.abs(dampedOffset) - 110) * 8);
      }

      currentOffsetRef.current = dampedOffset;
      setOffsetX(dampedOffset);

      if (Math.abs(dampedOffset) >= THRESHOLD && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        triggerHapticFeedback();
      } else if (Math.abs(dampedOffset) < THRESHOLD) {
        hasTriggeredHapticRef.current = false;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (Math.abs(currentOffsetRef.current) >= THRESHOLD) {
        setIsActionTriggered(true);
        setOffsetX(Math.sign(currentOffsetRef.current) * 350);
        setTimeout(() => {
          onTake();
          setOffsetX(0);
          setIsActionTriggered(false);
        }, 180);
      } else {
        setOffsetX(0);
        currentOffsetRef.current = 0;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isSwipingRight = offsetX > 10;
  const isSwipingLeft = offsetX < -10;
  const isOverThreshold = Math.abs(offsetX) >= THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-2xl select-none touch-pan-y">
      {/* Background action reveal layer (Telegram-style swipe to take) */}
      {(isSwipingRight || isSwipingLeft || isActionTriggered) && (
        <div
          className={`absolute inset-0 rounded-2xl flex items-center transition-colors duration-150 ${
            isOverThreshold || isActionTriggered
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-500 text-emerald-50'
          } ${isSwipingRight ? 'justify-start pl-5' : 'justify-end pr-5'}`}
        >
          <div
            className={`flex items-center space-x-2 font-bold transition-transform duration-150 ${
              isOverThreshold ? 'scale-110' : 'scale-95'
            }`}
          >
            {isSwipingRight && (
              <>
                <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <span className="text-sm tracking-wide">
                  {isOverThreshold ? 'Release to Take! 🎉' : 'Slide to Take'}
                </span>
              </>
            )}

            {isSwipingLeft && (
              <>
                <span className="text-sm tracking-wide">
                  {isOverThreshold ? 'Release to Take! 🎉' : 'Slide to Take'}
                </span>
                <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Foreground card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translateX(${offsetX}px)`,
        }}
        className={`p-4 rounded-2xl border transition-all ${
          isDragging ? 'cursor-grabbing duration-0' : 'cursor-grab duration-200 ease-out'
        } ${
          status === 'taken'
            ? 'bg-emerald-50/50 border-emerald-200 cursor-default'
            : status === 'skipped'
            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-default'
            : 'bg-white border-gray-200 card-shadow'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                status === 'taken'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Pill className="w-5 h-5" />
            </div>

            <div>
              <h4
                className={`text-base font-bold text-gray-900 ${
                  status === 'taken' ? 'line-through text-gray-500' : ''
                }`}
              >
                {med.name}
              </h4>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Dosage: <span className="text-gray-900 font-bold">{med.dosage}</span> •{' '}
                <span className="capitalize">{med.relationToMeal?.replace('_', ' ')}</span>
              </p>
              {med.instructions && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  Tip: {med.instructions}
                </p>
              )}
            </div>
          </div>

          {/* Low Refill Warning */}
          {med.remainingCount <= 3 && (
            <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>{med.remainingCount} left</span>
            </span>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          {status === 'taken' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <span>Taken</span>
              </span>
              <button
                onClick={onUndo}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full space-x-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={onSnooze}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Snooze 15m
                </button>
                <button
                  onClick={onSkip}
                  className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Skip
                </button>
              </div>

              {/* Both Methods Supported: Big Click Button + Slide Gesture Affordance */}
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center text-[11px] text-gray-400 space-x-0.5 font-medium select-none">
                  <ArrowLeft className="w-3 h-3 opacity-60" />
                  <span>slide card</span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </div>

                <button
                  onClick={onTake}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center space-x-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>I Took This</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
