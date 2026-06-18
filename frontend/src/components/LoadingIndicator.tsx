import type { AgentStage } from '../types';

interface LoadingIndicatorProps {
  stage: AgentStage;
}

export default function LoadingIndicator({ stage }: LoadingIndicatorProps) {
  if (!stage) return null;

  const label =
    stage === 'planning'
      ? 'Planning...'
      : 'Searching and building your itinerary...';

  return (
    <div className="flex justify-start mb-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      </div>
    </div>
  );
}
