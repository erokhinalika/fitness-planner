import { workouts } from "../data/workouts";
import type { WorkoutId } from "./types";

export const WORKOUT_WEEK_COUNT = 8;
export const workoutWeeks = Array.from({ length: WORKOUT_WEEK_COUNT }, (_, index) => index + 1);
export const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));

export function getWorkoutById(id: WorkoutId) {
  return workoutById.get(id);
}

export function getCurrentWeek(startDate: string, now = Date.now()) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = now - start.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export function getNextWorkout(completed: Record<string, boolean>, currentWeek: number) {
  const current = workouts.find((workout) => !completed[`week-${currentWeek}-${workout.id}`]);
  if (current) return { workout: current, week: currentWeek };
  return { workout: workouts[0], week: currentWeek + 1 };
}

export function getWorkoutProgress(completed: Record<string, boolean>, currentWeek: number) {
  const totalWeeks = Math.max(workoutWeeks.length, currentWeek);
  const total = workouts.length * totalWeeks;
  const done = Array.from({ length: totalWeeks }, (_, index) => index + 1).reduce(
    (sum, week) => sum + workouts.filter((workout) => completed[`week-${week}-${workout.id}`]).length,
    0,
  );
  return { total, done, percent: Math.round((done / total) * 100) };
}

export function getPlannedLoad(exerciseId: string) {
  for (const workout of workouts) {
    const item = workout.exercises.find((entry) => entry.exerciseId === exerciseId);
    if (item) return item.load;
  }
  return "кг";
}
