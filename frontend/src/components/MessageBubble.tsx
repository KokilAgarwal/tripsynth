import { useState } from 'react';
import type { PlannerTask } from '../types';
import { formatTime } from '../utils/api';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: PlannerTask[];
}

export default function MessageBubble({ role, content, timestamp, reasoning }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          {content}
        </div>
        <span className="mt-1 text-xs text-gray-400 px-1">{formatTime(timestamp)}</span>

        {!isUser && reasoning && reasoning.length > 0 && (
          <div className="mt-2 w-full">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? '▾ Hide agent reasoning' : '▸ Show agent reasoning'}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs">
                {reasoning.map((task) => (
                  <li key={task.id} className="flex gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-accent shrink-0">✓</span>
                    <span>{task.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
