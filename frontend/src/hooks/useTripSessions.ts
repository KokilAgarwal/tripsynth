import { useCallback, useEffect, useState } from 'react';
import type { TripSession } from '../types';

const STORAGE_KEY = 'tripsynth_trips';

export function useTripSessions() {
  const [trips, setTrips] = useState<TripSession[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeTripId, setActiveTripId] = useState<string | null>(() => {
    return trips[0]?.sessionId ?? null;
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  const activeTrip = trips.find((t) => t.sessionId === activeTripId) ?? null;

  const addTrip = useCallback((trip: TripSession) => {
    setTrips((prev) => {
      const exists = prev.find((t) => t.sessionId === trip.sessionId);
      if (exists) {
        return prev.map((t) => (t.sessionId === trip.sessionId ? trip : t));
      }
      return [...prev, trip];
    });
    setActiveTripId(trip.sessionId);
  }, []);

  const updateTrip = useCallback((sessionId: string, updates: Partial<TripSession>) => {
    setTrips((prev) =>
      prev.map((t) => (t.sessionId === sessionId ? { ...t, ...updates } : t))
    );
  }, []);

  const startNewTrip = useCallback(async () => {
    const { createSession } = await import('../utils/api');
    const { session_id, trip_name } = await createSession();
    const trip: TripSession = {
      sessionId: session_id,
      tripName: trip_name,
      messages: [],
      itinerary: null,
    };
    addTrip(trip);
    return trip;
  }, [addTrip]);

  const ensureActiveTrip = useCallback(async (): Promise<TripSession> => {
    if (activeTrip) return activeTrip;
    return startNewTrip();
  }, [activeTrip, startNewTrip]);

  return {
    trips,
    activeTrip,
    activeTripId,
    setActiveTripId,
    addTrip,
    updateTrip,
    startNewTrip,
    ensureActiveTrip,
  };
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('tripsynth_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('tripsynth_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const show = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  return { toast, show };
}
