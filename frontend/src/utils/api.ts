import type { ChatStreamEvent, Itinerary } from '../types';

export async function createSession(): Promise<{ session_id: string; trip_name: string }> {
  const res = await fetch('/api/sessions', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function* streamChat(
  message: string,
  sessionId: string,
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  });

  if (!res.ok) {
    throw new Error("Couldn't reach the planning service, please try again");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: ChatStreamEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

export function diffItinerary(
  prev: Itinerary | null,
  next: Itinerary | null
): Set<string> {
  const changed = new Set<string>();
  if (!next) return changed;
  if (!prev) {
    next.days.forEach((d) => changed.add(`day-${d.day}`));
    return changed;
  }

  if (prev.destination !== next.destination) changed.add('destination');
  if (prev.date_range !== next.date_range) changed.add('date_range');
  if (prev.total_budget !== next.total_budget) changed.add('budget');
  if (prev.budget_used !== next.budget_used) changed.add('budget');

  const prevDays = new Map(prev.days.map((d) => [d.day, d]));
  for (const day of next.days) {
    const old = prevDays.get(day.day);
    if (!old || JSON.stringify(old) !== JSON.stringify(day)) {
      changed.add(`day-${day.day}`);
    }
  }

  return changed;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function timeSlotLabel(slot: string): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
