import { defaultPlaylists, type WorkoutId } from "@/entities";

export type ReminderSettings = {
  enabled: boolean;
  workoutTime: string;
  measureTime: string;
};

export type ReminderMarks = {
  workout?: string;
  measure?: string;
};

export type Measurement = {
  week: number;
  weight: string;
  waist: string;
  belly: string;
  hips: string;
  note: string;
};

export type ProgressPhotoMeta = {
  id: string;
  label: string;
  week: number;
  createdAt: string;
};

export type ProgressPhotoView = ProgressPhotoMeta & {
  src: string;
};

export type ExtraFoodItem = {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  per100g?: {
    kcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
  };
};

export type PlannerMeta = {
  version: 3;
  startDate: string;
  completed: Record<string, boolean>;
  calendarLog: Record<string, WorkoutId[]>;
  measurements: Measurement[];
  shopping: Record<string, boolean>;
  selectedMeals: Record<string, string>;
  extraFood: ExtraFoodItem[];
  useMenuToday: boolean;
  playlists: typeof defaultPlaylists;
  weightLogs: Record<string, string>;
  reminders: ReminderSettings;
  reminderMarks: ReminderMarks;
};

export type ExportPayload = {
  exportedAt: string;
  app: "angelika-fitness-planner";
  state: PlannerMeta & {
    photos: Array<ProgressPhotoMeta & { src: string }>;
  };
};
