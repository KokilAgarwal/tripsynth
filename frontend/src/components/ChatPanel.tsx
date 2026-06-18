import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentStage, ChatMessage, TripSession } from '../types';
import { streamChat } from '../utils/api';
import LoadingIndicator from './LoadingIndicator';
import MessageBubble from './MessageBubble';

const QUICK_STARTS = [
  'Weekend trip to Goa',
  '5 days in Kerala, budget travel',
  'Family trip to Manali',
];

interface ChatPanelProps {
  trip: TripSession | null;
  onUpdate: (sessionId: string, updates: Partial<TripSession>) => void;
  onItinerary: (sessionId: string, itinerary: TripSession['itinerary'], tripName?: string) => void;
  onError: (message: string) => void;
  ensureTrip: () => Promise<TripSession>;
}

export default function ChatPanel({
  trip,
  onUpdate,
  onItinerary,
  onError,
  ensureTrip,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<AgentStage>(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trip?.messages, stage]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [trip?.sessionId]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setStage(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const active = trip ?? (await ensureTrip());
      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const messagesWithUser = [...active.messages, userMsg];
      onUpdate(active.sessionId, { messages: messagesWithUser });
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      let pendingReasoning: ChatMessage['reasoning'];
      let assistantContent = '';
      let newTripName: string | undefined;

      for await (const event of streamChat(trimmed, active.sessionId, abortRef.current.signal)) {
        if (event.type === 'stage' && event.stage) {
          setStage(event.stage);
        } else if (event.type === 'message' && event.content) {
          assistantContent = event.content;
          if (event.reasoning) pendingReasoning = event.reasoning;
          if (event.trip_name) newTripName = event.trip_name;
        } else if (event.type === 'itinerary' && event.itinerary) {
          onItinerary(active.sessionId, event.itinerary, event.trip_name);
          if (event.trip_name) newTripName = event.trip_name;
        } else if (event.type === 'error') {
          onError(event.error || "Couldn't reach the planning service, please try again");
        } else if (event.type === 'done') {
          break;
        }
      }

      if (assistantContent) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
          reasoning: pendingReasoning,
        };
        onUpdate(active.sessionId, {
          messages: [...messagesWithUser, assistantMsg],
          ...(newTripName ? { tripName: newTripName } : {}),
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError("Couldn't reach the planning service, please try again");
      }
    } finally {
      setStage(null);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const messages = trip?.messages ?? [];
  const showQuickStarts = messages.length === 0 && !sending;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        {messages.length === 0 && !sending && (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="mb-4 text-4xl">✈️</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Where would you like to go?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Describe your dream trip and TripSynth will build a day-by-day itinerary for you.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={`${msg.timestamp}-${i}`}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            reasoning={msg.reasoning}
          />
        ))}

        <LoadingIndicator stage={stage} />
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 p-4 md:px-6">
        {showQuickStarts && (
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_STARTS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:border-accent hover:text-accent transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe your trip..."
            rows={1}
            disabled={sending}
            aria-label="Trip message input"
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
