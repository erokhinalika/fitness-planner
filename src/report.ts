import { profile, progression, workouts } from "./data";
import {
  getProgressionForWeek,
  getWeightLogKey,
  getWorkoutKey,
  journalExerciseIds,
  type Measurement,
  type PlannerMeta,
  type ProgressPhotoView,
} from "./storage";

const weeks = Array.from({ length: 8 }, (_, index) => index + 1);

export function parseMeasurementValue(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatReportDate(date = new Date()) {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMeasurementDelta(current: number, baseline: number, unit: string) {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.05) return "—";
  const sign = diff > 0 ? "+" : "−";
  const value = Math.abs(diff);
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
  return `${sign}${formatted} ${unit}`;
}

export function getBaselineMeasurement(measurements: Measurement[]) {
  const week1 = measurements.find((item) => item.week === 1);
  return {
    weight: parseMeasurementValue(week1?.weight ?? "") ?? profile.weight,
    waist: parseMeasurementValue(week1?.waist ?? "") ?? profile.waist,
    belly: parseMeasurementValue(week1?.belly ?? "") ?? 0,
    hips: parseMeasurementValue(week1?.hips ?? "") ?? profile.hips,
  };
}

export function getLatestMeasurement(measurements: Measurement[]) {
  return [...measurements]
    .reverse()
    .find((item) => item.weight || item.waist || item.belly || item.hips);
}

export function pickReportPhotos(photos: ProgressPhotoView[]) {
  const before = photos.find((photo) => photo.label === "До") ?? photos.find((photo) => photo.week === 1);
  const after = photos.find((photo) => photo.label === "После") ?? photos.find((photo) => photo.week === 8);
  if (before && after && before.id !== after.id) return { before, after };
  const sorted = [...photos].sort((left, right) => left.week - right.week || left.createdAt.localeCompare(right.createdAt));
  if (sorted.length >= 2) return { before: sorted[0], after: sorted[sorted.length - 1] };
  return null;
}

export function getWorkoutRows(completed: Record<string, boolean>) {
  return weeks.map((week) => ({
    week,
    block: getProgressionForWeek(week),
    workouts: workouts.map((workout) => ({
      id: workout.id,
      title: workout.title,
      shortDay: workout.shortDay,
      done: Boolean(completed[getWorkoutKey(week, workout.id)]),
    })),
    doneCount: workouts.filter((workout) => completed[getWorkoutKey(week, workout.id)]).length,
  }));
}

export function getWeightJournalRows(weightLogs: Record<string, string>, exerciseNames: Record<string, string>) {
  return weeks.map((week) => {
    const block = getProgressionForWeek(week);
    return {
      week,
      block,
      entries: journalExerciseIds.map((exerciseId) => ({
        exerciseId,
        name: exerciseNames[exerciseId] ?? exerciseId,
        value: weightLogs[getWeightLogKey(week, exerciseId)] ?? "",
      })),
    };
  });
}

export function getFilledMeasurementWeeks(measurements: Measurement[]) {
  return measurements.filter(
    (item) => item.weight || item.waist || item.belly || item.hips || item.note,
  );
}

export function getCurrentProgressionBlock(currentWeek: number) {
  if (currentWeek <= 2) return progression[0];
  if (currentWeek <= 4) return progression[1];
  if (currentWeek <= 6) return progression[2];
  return progression[3];
}

export function buildReportFilename(currentWeek: number) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `angelika-report-week-${currentWeek}-${stamp}.pdf`;
}

export type ReportSummary = {
  baseline: ReturnType<typeof getBaselineMeasurement>;
  latest: ReturnType<typeof getLatestMeasurement>;
  comparePhotos: ReturnType<typeof pickReportPhotos>;
  workoutRows: ReturnType<typeof getWorkoutRows>;
  weightRows: ReturnType<typeof getWeightJournalRows>;
  filledMeasurements: ReturnType<typeof getFilledMeasurementWeeks>;
  progressionBlock: ReturnType<typeof getCurrentProgressionBlock>;
};

export function buildReportSummary(
  state: PlannerMeta,
  photos: ProgressPhotoView[],
  currentWeek: number,
  exerciseNames: Record<string, string>,
): ReportSummary {
  return {
    baseline: getBaselineMeasurement(state.measurements),
    latest: getLatestMeasurement(state.measurements),
    comparePhotos: pickReportPhotos(photos),
    workoutRows: getWorkoutRows(state.completed),
    weightRows: getWeightJournalRows(state.weightLogs, exerciseNames),
    filledMeasurements: getFilledMeasurementWeeks(state.measurements),
    progressionBlock: getCurrentProgressionBlock(currentWeek),
  };
}
