import type { WorkoutId } from "@/entities";

export type ExerciseContext = {
  exerciseId: string;
  workoutId?: WorkoutId;
  week?: number;
  volume?: string;
  load?: string;
  cue?: string;
};
