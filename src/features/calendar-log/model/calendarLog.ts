import { workouts, type WorkoutId } from "@/entities";
import type { PlannerMeta } from "@/features/planner-storage/model/types";

const workoutDayOffsets = [0, 2, 4, 5] as const;
const workoutIds = new Set<WorkoutId>(workouts.map((workout) => workout.id));

export function getWorkoutKey(week: number, workoutId: WorkoutId) {
  return `week-${week}:${workoutId}`;
}

export function parseCompletedWorkoutKey(key: string): { week: number; workoutId: WorkoutId } | null {
  const match = key.match(/^week-(\d+):(.+)$/);
  if (!match) return null;
  const week = Number(match[1]);
  const workoutId = match[2] as WorkoutId;
  if (!Number.isInteger(week) || week < 1 || !workoutIds.has(workoutId)) return null;
  return { week, workoutId };
}

export function getWorkoutDayOffset(workoutId: WorkoutId) {
  const index = workouts.findIndex((workout) => workout.id === workoutId);
  return workoutDayOffsets[index] ?? 0;
}

function getWeekForDate(startDate: string, date: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return 1;
  const diffDays = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function logWorkoutOnDate(
  meta: PlannerMeta,
  date: string,
  workoutId: WorkoutId,
  completedWeek = getWeekForDate(meta.startDate, date),
): PlannerMeta {
  const existing = meta.calendarLog[date] ?? [];
  const calendarLog = existing.includes(workoutId)
    ? meta.calendarLog
    : { ...meta.calendarLog, [date]: [...existing, workoutId] };

  const key = getWorkoutKey(completedWeek, workoutId);
  const completed = meta.completed[key] ? meta.completed : { ...meta.completed, [key]: true };

  return { ...meta, calendarLog, completed };
}

export function removeWorkoutLog(meta: PlannerMeta, date: string, workoutId: WorkoutId): PlannerMeta {
  const existing = meta.calendarLog[date];
  if (!existing?.includes(workoutId)) return meta;

  const filtered = existing.filter((id) => id !== workoutId);
  const calendarLog = { ...meta.calendarLog };
  if (filtered.length) calendarLog[date] = filtered;
  else delete calendarLog[date];

  const week = getWeekForDate(meta.startDate, date);
  const key = getWorkoutKey(week, workoutId);
  const stillLoggedInWeek = Object.entries(calendarLog).some(
    ([loggedDate, ids]) => ids.includes(workoutId) && getWeekForDate(meta.startDate, loggedDate) === week,
  );
  if (stillLoggedInWeek || !meta.completed[key]) return { ...meta, calendarLog };

  const completed = { ...meta.completed };
  delete completed[key];
  return { ...meta, calendarLog, completed };
}

export const journalExerciseIds = ["hip-thrust", "rdl", "barbell-row"] as const;

export type JournalExerciseId = (typeof journalExerciseIds)[number];
