import { useCallback, useState } from 'react';
import type { Itinerary } from './types';
import ChatPanel from './components/ChatPanel';
import ItineraryPanel from './components/ItineraryPanel';
import TopBar from './components/TopBar';
import { useTheme, useToast, useTripSessions } from './hooks/useTripSessions';

export default function App() {
  const { trips, activeTrip, activeTripId, setActiveTripId, updateTrip, startNewTrip, ensureActiveTrip } =
    useTripSessions();
  const { dark, toggle: toggleTheme } = useTheme();
  const { toast, show: showToast } = useToast();
  const [showItineraryMobile, setShowItineraryMobile] = useState(false);

  const handleItinerary = useCallback(
    (sessionId: string, itinerary: Itinerary | null, tripName?: string) => {
      updateTrip(sessionId, {
        itinerary,
        ...(tripName ? { tripName } : {}),
      });
    },
    [updateTrip]
  );

  const handleStartNew = async () => {
    try {
      await startNewTrip();
      setShowItineraryMobile(false);
    } catch {
      showToast("Couldn't create a new trip, please try again");
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <TopBar
        trips={trips}
        activeTripId={activeTripId}
        onSelectTrip={setActiveTripId}
        dark={dark}
        onToggleTheme={toggleTheme}
      />

      {/* Mobile: itinerary tab */}
      <div className="md:hidden border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <button
          type="button"
          onClick={() => setShowItineraryMobile(true)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-sm font-medium text-accent"
        >
          View itinerary
          {activeTrip?.itinerary ? ` · ${activeTrip.itinerary.destination}` : ''}
        </button>
      </div>

      {/* Desktop: side-by-side | Tablet: stacked | Mobile: chat only */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col lg:w-[40%] lg:flex-none lg:border-r border-gray-200 dark:border-gray-800 md:max-h-[50%] lg:max-h-none">
          <ChatPanel
            trip={activeTrip}
            onUpdate={updateTrip}
            onItinerary={handleItinerary}
            onError={showToast}
            ensureTrip={ensureActiveTrip}
          />
        </div>

        <div className="hidden md:flex min-h-0 flex-1 flex-col lg:w-[60%] md:max-h-[50%] lg:max-h-none">
          <ItineraryPanel
            itinerary={activeTrip?.itinerary ?? null}
            tripName={activeTrip?.tripName ?? 'My Trip'}
            onStartNew={handleStartNew}
          />
        </div>
      </div>

      {/* Mobile itinerary overlay */}
      {showItineraryMobile && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowItineraryMobile(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 w-full bg-gray-50 dark:bg-gray-900 shadow-xl animate-slide-in">
            <ItineraryPanel
              itinerary={activeTrip?.itinerary ?? null}
              tripName={activeTrip?.tripName ?? 'My Trip'}
              onStartNew={handleStartNew}
              visible
              onClose={() => setShowItineraryMobile(false)}
            />
          </div>
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
