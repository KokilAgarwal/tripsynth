import type { TripSession } from '../types';

interface TopBarProps {
  trips: TripSession[];
  activeTripId: string | null;
  onSelectTrip: (id: string) => void;
  dark: boolean;
  onToggleTheme: () => void;
}

export default function TopBar({
  trips,
  activeTripId,
  onSelectTrip,
  dark,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold">
            T
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">TripSynth</span>
        </div>

        {trips.length > 1 && (
          <select
            value={activeTripId ?? ''}
            onChange={(e) => onSelectTrip(e.target.value)}
            className="ml-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Switch trip"
          >
            {trips.map((t) => (
              <option key={t.sessionId} value={t.sessionId}>
                {t.tripName}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {dark ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
    </header>
  );
}
