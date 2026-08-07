import { warmupSteps, workoutById, type Workout, type WorkoutId } from "@/entities";

const ACTIVE_WORKOUT_SESSION_KEY = "angelika-active-workout-session-v1";

export const SET_REST_SEC = 90;
export const BETWEEN_EXERCISE_REST_SEC = 75;

export type CircuitPhase = "idle" | "work" | "exercise-rest" | "round-rest" | "done";

export type CircuitRuntime = {
  phase: CircuitPhase;
  round: number;
  exerciseIndex: number;
  secondsLeft: number;
  manualWork: boolean;
  paused: boolean;
};

export type SessionPhase =
  "warmup" | "work" | "rest" | "circuit-work" | "circuit-exercise-rest" | "circuit-round-rest" | "done";

export type SessionRuntime = {
  phase: SessionPhase;
  warmupIndex: number;
  exerciseIndex: number;
  setNumber: number;
  restSecondsLeft: number;
  workSecondsLeft: number;
  manualWork: boolean;
  paused: boolean;
  circuitRound: number;
};

type SavedWorkoutSession = {
  version: 1;
  workoutId: WorkoutId;
  week: number;
  runtime: SessionRuntime;
};

const sessionPhases: SessionPhase[] = [
  "warmup",
  "work",
  "rest",
  "circuit-work",
  "circuit-exercise-rest",
  "circuit-round-rest",
  "done",
];

export function parseWorkDuration(volume: string) {
  const secMatch = volume.match(/(\d+)\s*сек/i);
  if (secMatch) return { mode: "time" as const, seconds: Number(secMatch[1]) };
  return { mode: "reps" as const, label: volume };
}

export function parseSetPlan(volume: string) {
  const trimmed = volume.trim();
  const timedStandalone = trimmed.match(/^(\d+)\s*сек/i);
  if (timedStandalone && !trimmed.match(/[x×]/i)) {
    return { sets: 1, label: trimmed, timedSeconds: Number(timedStandalone[1]) };
  }
  const setsMatch = trimmed.match(/^(\d+)\s*[x×]/i);
  const approachMatch = trimmed.match(/^(\d+)\s+подход/i);
  const timedInSet = trimmed.match(/(\d+)\s*(?:-|–)?\s*(\d+)?\s*сек/i);
  const sets = setsMatch ? Number(setsMatch[1]) : approachMatch ? Number(approachMatch[1]) : 1;
  const timedSeconds = timedInSet ? Number(timedInSet[2] ?? timedInSet[1]) : undefined;
  return { sets, label: trimmed, timedSeconds };
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function createCircuitTimerWorkState(workout: Workout, round: number, exerciseIndex: number): CircuitRuntime {
  const item = workout.exercises[exerciseIndex];
  const parsed = parseWorkDuration(item.volume);
  if (parsed.mode === "time") {
    return {
      phase: "work",
      round,
      exerciseIndex,
      secondsLeft: parsed.seconds,
      manualWork: false,
      paused: false,
    };
  }
  return {
    phase: "work",
    round,
    exerciseIndex,
    secondsLeft: 0,
    manualWork: true,
    paused: false,
  };
}

export function createInitialSessionRuntime(): SessionRuntime {
  return {
    phase: "warmup",
    warmupIndex: 0,
    exerciseIndex: 0,
    setNumber: 1,
    restSecondsLeft: 0,
    workSecondsLeft: 0,
    manualWork: false,
    paused: false,
    circuitRound: 1,
  };
}

export function createCircuitWorkState(
  workout: Workout,
  round: number,
  exerciseIndex: number,
): Pick<
  SessionRuntime,
  "phase" | "circuitRound" | "exerciseIndex" | "workSecondsLeft" | "manualWork" | "restSecondsLeft"
> {
  const item = workout.exercises[exerciseIndex];
  const parsed = parseWorkDuration(item.volume);
  if (parsed.mode === "time") {
    return {
      phase: "circuit-work",
      circuitRound: round,
      exerciseIndex,
      workSecondsLeft: parsed.seconds,
      manualWork: false,
      restSecondsLeft: 0,
    };
  }
  return {
    phase: "circuit-work",
    circuitRound: round,
    exerciseIndex,
    workSecondsLeft: 0,
    manualWork: true,
    restSecondsLeft: 0,
  };
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function normalizeSavedRuntime(value: unknown, workout: Workout): SessionRuntime | null {
  if (!value || typeof value !== "object") return null;
  const runtime = value as Partial<SessionRuntime>;
  const phase = runtime.phase;
  if (!phase || !sessionPhases.includes(phase)) return null;
  if (!isNumberInRange(runtime.warmupIndex, 0, warmupSteps.length - 1)) return null;
  if (!isNumberInRange(runtime.exerciseIndex, 0, Math.max(0, workout.exercises.length - 1))) return null;
  if (!isNumberInRange(runtime.setNumber, 1, 20)) return null;
  if (!isNumberInRange(runtime.restSecondsLeft, 0, 60 * 60)) return null;
  if (!isNumberInRange(runtime.workSecondsLeft, 0, 60 * 60)) return null;
  if (typeof runtime.manualWork !== "boolean" || typeof runtime.paused !== "boolean") return null;
  if (!isNumberInRange(runtime.circuitRound, 1, workout.circuit?.rounds ?? 1)) return null;

  return {
    phase,
    warmupIndex: runtime.warmupIndex,
    exerciseIndex: runtime.exerciseIndex,
    setNumber: runtime.setNumber,
    restSecondsLeft: runtime.restSecondsLeft,
    workSecondsLeft: runtime.workSecondsLeft,
    manualWork: runtime.manualWork,
    paused: runtime.paused,
    circuitRound: runtime.circuitRound,
  };
}

export function readSavedWorkoutSession(): { workoutId: WorkoutId; week: number } | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedWorkoutSession>;
    if (saved.version !== 1 || typeof saved.workoutId !== "string" || typeof saved.week !== "number") return null;
    const workout = workoutById.get(saved.workoutId as WorkoutId);
    if (!workout || !isNumberInRange(saved.week, 1, 520)) return null;
    if (!normalizeSavedRuntime(saved.runtime, workout)) return null;
    return { workoutId: saved.workoutId as WorkoutId, week: saved.week };
  } catch {
    return null;
  }
}

export function readSavedWorkoutRuntime(workout: Workout, week: number): SessionRuntime | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedWorkoutSession>;
    if (saved.version !== 1 || saved.workoutId !== workout.id || saved.week !== week) return null;
    return normalizeSavedRuntime(saved.runtime, workout);
  } catch {
    return null;
  }
}

export function saveWorkoutSession(workout: Workout, week: number, runtime: SessionRuntime) {
  try {
    const saved: SavedWorkoutSession = {
      version: 1,
      workoutId: workout.id,
      week,
      runtime,
    };
    localStorage.setItem(ACTIVE_WORKOUT_SESSION_KEY, JSON.stringify(saved));
  } catch {
    // Saving workout progress is best-effort.
  }
}

export function clearSavedWorkoutSession() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
  } catch {
    // Clearing workout progress is best-effort.
  }
}
