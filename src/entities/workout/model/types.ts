export type WorkoutId = "upper-a" | "glutes" | "upper-b" | "full-body";

export type WorkoutExercise = {
  exerciseId: string;
  volume: string;
  load: string;
  cue: string;
};

export type CircuitConfig = {
  rounds: number;
  exerciseRestSec: number;
  roundRestSec: number;
};

export type WorkoutCompletionEffect = {
  title: string;
  summary: string;
  bullets: string[];
  recovery: string;
};

export type Workout = {
  id: WorkoutId;
  day: string;
  shortDay: string;
  title: string;
  focus: string;
  duration: string;
  accent: string;
  exercises: WorkoutExercise[];
  completionEffect: WorkoutCompletionEffect;
  note?: string;
  circuit?: CircuitConfig;
};

export type ProgressionBlock = {
  weeks: string;
  focus: string;
  barbell: string;
  intensity: string;
  cue: string;
};

export type WarmupStep = {
  id: string;
  title: string;
  duration: string;
  details: string;
};
