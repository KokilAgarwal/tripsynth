export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface Activity {
  time: TimeSlot;
  name: string;
  description: string;
  estimated_cost: number;
  lat?: number | null;
  lng?: number | null;
}

export interface DayPlan {
  day: number;
  date_label: string;
  activities: Activity[];
}

export interface Itinerary {
  destination: string;
  date_range: string;
  total_budget: number;
  budget_used: number;
  num_days: number;
  days: DayPlan[];
}

export interface PlannerTask {
  id: number;
  description: string;
  status: 'pending' | 'done';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: PlannerTask[];
}

export interface TripSession {
  sessionId: string;
  tripName: string;
  messages: ChatMessage[];
  itinerary: Itinerary | null;
}

export type AgentStage = 'planning' | 'worker' | null;

export interface ChatStreamEvent {
  type: 'stage' | 'reasoning' | 'message' | 'itinerary' | 'error' | 'done';
  stage?: 'planning' | 'worker';
  content?: string;
  reasoning?: PlannerTask[];
  itinerary?: Itinerary;
  session_id?: string;
  trip_name?: string;
  error?: string;
}
