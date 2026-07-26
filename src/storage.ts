import { defaultPlaylists, meals, profile, progression, type WorkoutId } from "./data";

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
    const meta: PlannerMeta = {
      ...createDefaultMeta(),
      ...parsed,
      version: 3,
      measurements: parsed.measurements?.length ? parsed.measurements : createDefaultMeasurements(),
      playlists: parsed.playlists?.length ? parsed.playlists : defaultPlaylists,
      weightLogs: parsed.weightLogs ?? {},
      reminders: parsed.reminders ?? createDefaultMeta().reminders,
      reminderMarks: parsed.reminderMarks ?? {},
      calendarLog: parsed.calendarLog ?? {},
    };
    await writeMeta(db, meta);
    await importLegacyPhotos(db, parsed.photos);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Keep legacy data if migration fails.
  }
}

export async function loadPlannerData() {
  const db = await openDb();
  const existing = await readMeta(db);
  if (!existing) {
    await migrateLegacyLocalStorage(db);
  }
  const meta = (await readMeta(db)) ?? createDefaultMeta();
  const normalized: PlannerMeta = {
    ...createDefaultMeta(),
    ...meta,
    version: 3,
    measurements: meta.measurements?.length ? meta.measurements : createDefaultMeasurements(),
    playlists: meta.playlists?.length ? meta.playlists : defaultPlaylists,
    weightLogs: meta.weightLogs ?? {},
    reminders: meta.reminders ?? createDefaultMeta().reminders,
    reminderMarks: meta.reminderMarks ?? {},
    extraFood: meta.extraFood ?? [],
    useMenuToday: meta.useMenuToday ?? true,
    calendarLog: meta.calendarLog ?? {},
  };
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

export type ExportPayload = {
  exportedAt: string;
  app: "angelika-fitness-planner";
  state: PlannerMeta & {
    photos: Array<ProgressPhotoMeta & { src: string }>;
  };
};

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
  const meta: PlannerMeta = {
    ...createDefaultMeta(),
    ...incoming,
    version: 3,
    measurements: incoming.measurements?.length ? incoming.measurements : createDefaultMeasurements(),
    playlists: incoming.playlists?.length ? incoming.playlists : defaultPlaylists,
    weightLogs: incoming.weightLogs ?? {},
    reminders: incoming.reminders ?? createDefaultMeta().reminders,
    reminderMarks: incoming.reminderMarks ?? {},
    calendarLog: incoming.calendarLog ?? {},
  };
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

export const journalExerciseIds = ["hip-thrust", "rdl", "barbell-row"] as const;

export type JournalExerciseId = (typeof journalExerciseIds)[number];

export function getWorkoutKey(week: number, workoutId: WorkoutId) {
  return `week-${week}:${workoutId}`;
}

function getWeekForDate(startDate: string, date: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return 1;
  const diffDays = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.min(8, Math.max(1, Math.floor(diffDays / 7) + 1));
}

export function logWorkoutOnDate(meta: PlannerMeta, date: string, workoutId: WorkoutId): PlannerMeta {
  const existing = meta.calendarLog[date] ?? [];
  const calendarLog = existing.includes(workoutId)
    ? meta.calendarLog
    : { ...meta.calendarLog, [date]: [...existing, workoutId] };

  const key = getWorkoutKey(getWeekForDate(meta.startDate, date), workoutId);
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

  return { ...meta, calendarLog };
}
