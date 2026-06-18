import { useEffect, useRef, useState } from 'react';
import type { Activity, DayPlan, Itinerary } from '../types';
import { diffItinerary, formatCurrency, timeSlotLabel } from '../utils/api';
import { downloadItineraryPdf } from '../utils/pdf';
import MapView from './MapView';

interface ItineraryPanelProps {
  itinerary: Itinerary | null;
  tripName: string;
  onStartNew: () => void;
  visible?: boolean;
  onClose?: () => void;
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-accent">
            {timeSlotLabel(activity.time)}
          </span>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{activity.name}</h4>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
          {formatCurrency(activity.estimated_cost)}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
    </div>
  );
}

function DaySection({
  day,
  expanded,
  onToggle,
  highlighted,
}: {
  day: DayPlan;
  expanded: boolean;
  onToggle: () => void;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors duration-highlight ${
        highlighted
          ? 'border-accent bg-accent-light/30 dark:bg-accent/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {day.date_label || `Day ${day.day}`}
        </span>
        <span className="text-gray-400">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          {day.activities.map((act, i) => (
            <ActivityCard key={`${act.name}-${i}`} activity={act} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItineraryPanel({
  itinerary,
  tripName,
  onStartNew,
  visible = true,
  onClose,
}: ItineraryPanelProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [selectedDay, setSelectedDay] = useState(1);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const prevItineraryRef = useRef<Itinerary | null>(null);

  useEffect(() => {
    if (itinerary && prevItineraryRef.current) {
      const changed = diffItinerary(prevItineraryRef.current, itinerary);
      if (changed.size > 0) {
        setHighlighted(changed);
        const timer = setTimeout(() => setHighlighted(new Set()), 800);
        prevItineraryRef.current = itinerary;
        return () => clearTimeout(timer);
      }
    }
    if (itinerary) {
      prevItineraryRef.current = itinerary;
      setExpandedDays(new Set(itinerary.days.map((d) => d.day)));
    }
  }, [itinerary]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const dayActivities =
    itinerary?.days.find((d) => d.day === selectedDay)?.activities ?? [];

  const budgetPct = itinerary
    ? Math.min(100, (itinerary.budget_used / itinerary.total_budget) * 100)
    : 0;

  if (!itinerary) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8 text-center ${
          visible ? '' : 'hidden lg:flex'
        }`}
      >
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-800 p-6">
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A2 2 0 013 16.382V5.618a2 2 0 011.553-1.894L9 1m0 18l6-3m-6 3V7m6 10l5.447 2.724A2 2 0 0021 18.382V7.618a2 2 0 00-1.553-1.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Your itinerary will appear here once you start planning
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col bg-gray-50 dark:bg-gray-900 ${
        visible ? '' : 'hidden lg:flex'
      }`}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur px-4 py-4 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={`text-lg font-semibold text-gray-900 dark:text-gray-100 truncate transition-colors duration-highlight ${
                highlighted.has('destination') ? 'text-accent' : ''
              }`}
            >
              {itinerary.destination}
            </h2>
            <p
              className={`text-sm text-gray-500 dark:text-gray-400 transition-colors duration-highlight ${
                highlighted.has('date_range') ? 'text-accent' : ''
              }`}
            >
              {itinerary.date_range} · {itinerary.num_days} days
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => downloadItineraryPdf(itinerary, tripName)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-accent hover:text-accent transition-colors"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onStartNew}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
            >
              New trip
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Budget used</span>
            <span
              className={`transition-colors duration-highlight ${
                highlighted.has('budget') ? 'text-accent font-medium' : ''
              }`}
            >
              {formatCurrency(itinerary.budget_used)} / {formatCurrency(itinerary.total_budget)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full bg-accent transition-all duration-highlight ${
                highlighted.has('budget') ? 'ring-2 ring-accent ring-offset-1' : ''
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-4">
        <div className="h-48">
          <MapView activities={dayActivities} className="h-48" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {itinerary.days.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => setSelectedDay(d.day)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDay === d.day
                  ? 'bg-accent text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>

        <div className="space-y-3 pb-6">
          {itinerary.days.map((day) => (
            <DaySection
              key={day.day}
              day={day}
              expanded={expandedDays.has(day.day)}
              highlighted={highlighted.has(`day-${day.day}`)}
              onToggle={() => {
                setExpandedDays((prev) => {
                  const next = new Set(prev);
                  if (next.has(day.day)) next.delete(day.day);
                  else next.add(day.day);
                  return next;
                });
                setSelectedDay(day.day);
              }}
            />
          ))}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden fixed top-4 right-4 z-50 rounded-full bg-gray-800/80 text-white p-2"
          aria-label="Close itinerary"
        >
          ✕
        </button>
      )}
    </div>
  );
}
