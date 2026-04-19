// Coach types
export interface Coach {
  id: string;
  business_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  stripe_account_id: string | null;
  max_clients: number | null;
  branding: Record<string, unknown> | null;
  is_accepting_clients: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  goal: string | null;
  onboarding_data: Record<string, unknown> | null;
  role: "client" | "coach" | "admin";
}

export interface CoachClient {
  id: string;
  coach_id: string;
  client_id: string;
  status: "active" | "paused" | "archived" | "pending";
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  monthly_rate_cents: number | null;
  billing_status: "active" | "past_due" | "cancelled" | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithProfile extends CoachClient {
  profiles: {
    id: string;
    first_name: string | null;
    goal: string | null;
  };
}

export interface DashboardStats {
  active_clients: number;
  pending_checkins: number;
  unread_messages: number;
  monthly_revenue_cents: number;
}

export interface CheckIn {
  id: string;
  client_id: string;
  coach_id: string;
  template_id: string | null;
  program_id: string | null;
  phase_id: string | null;
  status: "pending" | "submitted" | "reviewed" | "flagged";
  submitted_at: string | null;
  reviewed_at: string | null;
  responses: Record<string, unknown> | null;
  coach_feedback: string | null;
  coach_notes: string | null;
  flag_reasons: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CoachingProgram {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "draft" | "paused";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramPhase {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  phase_number: number;
  duration_weeks: number | null;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "upcoming";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: "text" | "voice" | "image" | "video" | "check_in_response" | "program_update";
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
}

// Check-in response structure (what the client fills out weekly)
export interface CheckInResponses {
  weight_kg?: number;
  weight_trend?: number[]; // daily weigh-ins for the week
  measurements?: {
    waist?: number;
    chest?: number;
    arms?: number;
    thighs?: number;
    hips?: number;
  };
  training_adherence?: number; // 1-10
  nutrition_adherence?: number; // 1-10
  energy_level?: number; // 1-10
  sleep_quality?: number; // 1-10
  sleep_hours?: number;
  hunger_level?: number; // 1-10
  stress_level?: number; // 1-10
  biggest_win?: string;
  biggest_challenge?: string;
  injuries_or_pain?: string;
  questions_for_coach?: string;
  custom_responses?: Record<string, string | number | boolean>;
}

export interface CheckInPhoto {
  id: string;
  check_in_id: string;
  angle: "front" | "back" | "side_left" | "side_right";
  file_path: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface BodyStat {
  id: string;
  client_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measurements: Record<string, number> | null;
  created_at: string;
}

export interface CheckInWithClient extends CheckIn {
  profiles: {
    id: string;
    first_name: string | null;
    goal: string | null;
  };
  check_in_photos?: CheckInPhoto[];
  coach_clients?: {
    status: string;
    monthly_rate_cents: number | null;
  };
}

// Coach notes — replaces Notion/external docs
export interface CoachNote {
  id: string;
  coach_id: string;
  client_id: string;
  category: "general" | "nutrition" | "training" | "lifestyle" | "pinned" | "weekly";
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Auto-flag types for check-in review
export type FlagType =
  | "weight_stall"
  | "weight_spike"
  | "missed_checkin"
  | "low_adherence"
  | "low_energy"
  | "poor_sleep"
  | "high_stress"
  | "pain_reported"
  | "declining_trend";

export interface CheckInFlag {
  type: FlagType;
  severity: "info" | "warning" | "critical";
  message: string;
  detail?: string;
}

// Habit tracking (coach-assigned)
export interface HabitAssignment {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  frequency: "daily" | "weekly";
  target_count: number;
  is_active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  count_completed: number;
}

export interface HabitWithLogs extends HabitAssignment {
  habit_logs: HabitLog[];
}

// Navigation
export type NavItem = {
  title: string;
  href: string;
  icon: string;
  badge?: number;
};
