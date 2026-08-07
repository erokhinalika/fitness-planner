import { defaultPlaylists, meals, profile, progression, type WorkoutId } from "@/entities";
import { getWorkoutDayOffset, parseCompletedWorkoutKey } from "@/features/calendar-log/model/calendarLog";
import type { ExportPayload, Measurement, PlannerMeta, ProgressPhotoMeta, ProgressPhotoView } from "./types";
export {
  getWorkoutKey,
  journalExerciseIds,
  logWorkoutOnDate,
  removeWorkoutLog,
} from "@/features/calendar-log/model/calendarLog";
export type {
  ExportPayload,
  ExtraFoodItem,
  Measurement,
  PlannerMeta,
  ProgressPhotoMeta,
  ProgressPhotoView,
  ReminderMarks,
  ReminderSettings,
} from "./types";
import { addDays, toDateKey } from "@/shared/lib/date";

const DB_NAME = "angelika-fitness-planner";
const DB_VERSION = 1;
const META_KEY = "state";
const LEGACY_STORAGE_KEY = "angelika-fitness-planner-v2";

const weeks = Array.from({ length: 8 }, (_, index) => index + 1);

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultMeasurements(): Measurement[] {
  return weeks.map((week) => ({
    week,
    weight: week === 1 ? String(profile.weight) : "",
    waist: week === 1 ? String(profile.waist) : "",
    belly: "",
    hips: week === 1 ? String(profile.hips) : "",
    note: week === 1 ? "Старт" : "",
  }));
}

export function ensureMeasurementWeeks(measurements: Measurement[], targetWeek: number): Measurement[] {
  const maxExisting = measurements.reduce((max, item) => Math.max(max, item.week), 0);
  if (targetWeek <= maxExisting) return measurements;

  const extra: Measurement[] = [];
  for (let week = maxExisting + 1; week <= targetWeek; week += 1) {
    extra.push({ week, weight: "", waist: "", belly: "", hips: "", note: "" });
  }
  return [...measurements, ...extra];
}

export function createDefaultMeta(): PlannerMeta {
  return {
    version: 3,
    startDate: todayInputValue(),
    completed: {},
    calendarLog: {},
    measurements: createDefaultMeasurements(),
    shopping: {},
    selectedMeals: Object.fromEntries(meals.map((meal) => [meal.id, meal.options[0]?.id ?? ""])),
    extraFood: [],
    useMenuToday: true,
    playlists: defaultPlaylists,
    weightLogs: {},
    reminders: {
      enabled: false,
      workoutTime: "09:00",
      measureTime: "10:00",
    },
    reminderMarks: {},
  };
}

export function getWeightLogKey(week: number, exerciseId: string) {
  return `w${week}:${exerciseId}`;
}

export function getProgressionForWeek(week: number) {
  if (week <= 2) return progression[0];
  if (week <= 4) return progression[1];
  if (week <= 6) return progression[2];
  return progression[3];
}

type LegacyState = Partial<PlannerMeta> & {
  version?: number;
  weightLogs?: Record<string, string>;
  photos?: Array<ProgressPhotoMeta & { src?: string }>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
}

async function readMeta(db: IDBDatabase): Promise<PlannerMeta | null> {
  const tx = db.transaction("meta", "readonly");
  const request = tx.objectStore("meta").get(META_KEY);
  const value = await new Promise<PlannerMeta | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as PlannerMeta | undefined);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  return value ?? null;
}

async function writeMeta(db: IDBDatabase, meta: PlannerMeta) {
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(meta, META_KEY);
  await txDone(tx);
}

type PhotoRecord = ProgressPhotoMeta & { blob: Blob };

async function readAllPhotos(db: IDBDatabase): Promise<PhotoRecord[]> {
  const tx = db.transaction("photos", "readonly");
  const request = tx.objectStore("photos").getAll();
  const records = await new Promise<PhotoRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as PhotoRecord[]) ?? []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function writePhoto(db: IDBDatabase, record: PhotoRecord) {
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").put(record);
  await txDone(tx);
}

async function deletePhotoRecord(db: IDBDatabase, id: string) {
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").delete(id);
  await txDone(tx);
}

async function clearPhotos(db: IDBDatabase) {
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").clear();
  await txDone(tx);
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function hasTruthyRecordValue(record: Record<string, boolean> | undefined) {
  return Object.values(record ?? {}).some(Boolean);
}

function getWorkoutPlanDate(startDate: string, week: number, workoutId: WorkoutId) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  return addDays(start, (week - 1) * 7 + getWorkoutDayOffset(workoutId));
}

function restoreCalendarLogFromCompleted(
  startDate: string,
  completed: Record<string, boolean>,
  existingCalendarLog: Record<string, WorkoutId[]> = {},
) {
  const calendarLog: Record<string, WorkoutId[]> = { ...existingCalendarLog };

  for (const [key, done] of Object.entries(completed)) {
    if (!done) continue;
    const parsed = parseCompletedWorkoutKey(key);
    if (!parsed) continue;
    const planDate = getWorkoutPlanDate(startDate, parsed.week, parsed.workoutId);
    if (!planDate) continue;

    const dateKey = toDateKey(planDate);
    const existing = calendarLog[dateKey] ?? [];
    if (!existing.includes(parsed.workoutId)) {
      calendarLog[dateKey] = [...existing, parsed.workoutId];
    }
  }

  return calendarLog;
}

function normalizeMeta(meta: Partial<PlannerMeta> | null | undefined): PlannerMeta {
  const defaults = createDefaultMeta();
  const completed = meta?.completed ?? {};
  const hadCalendarLog = Boolean(meta && "calendarLog" in meta);
  const currentCalendarLog = meta?.calendarLog ?? {};
  const shouldRestoreCalendarLog =
    hasTruthyRecordValue(completed) && (!hadCalendarLog || Object.keys(currentCalendarLog).length === 0);
  const calendarLog = shouldRestoreCalendarLog
    ? restoreCalendarLogFromCompleted(meta?.startDate ?? defaults.startDate, completed, currentCalendarLog)
    : currentCalendarLog;

  return {
    ...defaults,
    ...meta,
    version: 3,
    completed,
    measurements: meta?.measurements?.length ? meta.measurements : createDefaultMeasurements(),
    playlists: meta?.playlists?.length ? meta.playlists : defaultPlaylists,
    weightLogs: meta?.weightLogs ?? {},
    reminders: meta?.reminders ?? defaults.reminders,
    reminderMarks: meta?.reminderMarks ?? {},
    extraFood: meta?.extraFood ?? [],
    useMenuToday: meta?.useMenuToday ?? true,
    calendarLog,
  };
}

export async function compressImage(file: File, maxSide = 1400, quality = 0.82) {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob ?? file;
}

function photoViewsFromRecords(records: PhotoRecord[]): ProgressPhotoView[] {
  return records.map((record) => ({
    id: record.id,
    label: record.label,
    week: record.week,
    createdAt: record.createdAt,
    src: URL.createObjectURL(record.blob),
  }));
}

async function importLegacyPhotos(db: IDBDatabase, photos: LegacyState["photos"]) {
  if (!photos?.length) return;
  await clearPhotos(db);
  for (const photo of photos.slice(0, 48)) {
    if (!photo.src) continue;
    await writePhoto(db, {
      id: photo.id,
      label: photo.label,
      week: photo.week,
      createdAt: photo.createdAt,
      blob: dataUrlToBlob(photo.src),
    });
  }
}

async function migrateLegacyLocalStorage(db: IDBDatabase) {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as LegacyState;
    const meta = normalizeMeta(parsed);
    await writeMeta(db, meta);
    await importLegacyPhotos(db, parsed.photos);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Keep legacy data if migration fails.
  }
}

async function restoreMissingMetaFromLegacyLocalStorage(db: IDBDatabase, existing: PlannerMeta) {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw || hasTruthyRecordValue(existing.completed)) return existing;

  try {
    const parsed = JSON.parse(raw) as LegacyState;
    if (!hasTruthyRecordValue(parsed.completed)) return existing;

    const restored = normalizeMeta({
      ...existing,
      completed: parsed.completed,
      calendarLog: existing.calendarLog,
    });
    await writeMeta(db, restored);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return restored;
  } catch {
    return existing;
  }
}

export async function loadPlannerData() {
  const db = await openDb();
  const existing = await readMeta(db);
  if (!existing) {
    await migrateLegacyLocalStorage(db);
  }
  const meta = normalizeMeta((await readMeta(db)) ?? createDefaultMeta());
  const normalized = await restoreMissingMetaFromLegacyLocalStorage(db, meta);
  await writeMeta(db, normalized);
  const records = await readAllPhotos(db);
  return {
    meta: normalized,
    photos: photoViewsFromRecords(records),
  };
}

export async function savePlannerMeta(meta: PlannerMeta) {
  const db = await openDb();
  await writeMeta(db, { ...meta, version: 3 });
}

export async function addPlannerPhoto(file: File, label: string, week: number) {
  const blob = await compressImage(file);
  const db = await openDb();
  const record: PhotoRecord = {
    id: crypto.randomUUID(),
    label,
    week,
    createdAt: new Date().toISOString(),
    blob,
  };
  await writePhoto(db, record);
  return {
    id: record.id,
    label: record.label,
    week: record.week,
    createdAt: record.createdAt,
    src: URL.createObjectURL(blob),
  } satisfies ProgressPhotoView;
}

export async function removePlannerPhoto(id: string) {
  const db = await openDb();
  await deletePhotoRecord(db, id);
}

export async function buildExportPayload(meta: PlannerMeta, photos: ProgressPhotoView[]): Promise<ExportPayload> {
  const db = await openDb();
  const records = await readAllPhotos(db);
  const recordById = new Map(records.map((record) => [record.id, record]));

  const exportedPhotos = await Promise.all(
    photos.map(async (photo) => {
      const record = recordById.get(photo.id);
      if (!record) {
        return { id: photo.id, label: photo.label, week: photo.week, createdAt: photo.createdAt, src: photo.src };
      }
      const dataUrl = await blobToDataUrl(record.blob);
      return { id: photo.id, label: photo.label, week: photo.week, createdAt: photo.createdAt, src: dataUrl };
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    app: "angelika-fitness-planner",
    state: { ...meta, version: 3, photos: exportedPhotos },
  };
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function importPlannerPayload(payload: ExportPayload) {
  const db = await openDb();
  const incoming = payload.state;
  const meta = normalizeMeta(incoming);
  await writeMeta(db, meta);
  await importLegacyPhotos(db, incoming.photos);
  const photos = photoViewsFromRecords(await readAllPhotos(db));
  return { meta, photos };
}

export function revokePhotoUrls(photos: ProgressPhotoView[]) {
  for (const photo of photos) {
    if (photo.src.startsWith("blob:")) URL.revokeObjectURL(photo.src);
  }
}
