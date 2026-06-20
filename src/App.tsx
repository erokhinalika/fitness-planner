import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Coffee,
  Cookie,
  Download,
  Dumbbell,
  FileText,
  FileUp,
  Gauge,
  Home,
  Images,
  Library,
  ListChecks,
  Moon,
  Pause,
  Play,
  Plus,
  Scale,
  Ruler,
  Salad,
  Search,
  Smartphone,
  Timer,
  Trash2,
  Upload,
  UtensilsCrossed,
  WifiOff,
  X,
  Bell,
  type LucideIcon,
} from "lucide-react";
import {
  defaultPlaylists,
  exercises,
  meals,
  profile,
  progression,
  shoppingItems,
  warmupSteps,
  workouts,
  type Exercise,
  type ExerciseCategory,
  type MealOption,
  type Playlist,
  type Workout,
  type WorkoutExercise,
  type WorkoutId,
} from "./data";
import {
  addPlannerPhoto,
  buildExportPayload,
  createDefaultMeta,
  getProgressionForWeek,
  getWeightLogKey,
  getWorkoutKey,
  importPlannerPayload,
  journalExerciseIds,
  loadPlannerData,
  removePlannerPhoto,
  revokePhotoUrls,
  savePlannerMeta,
  type ExportPayload,
  type ExtraFoodItem,
  type Measurement,
  type PlannerMeta,
  type ProgressPhotoView,
} from "./storage";
import {
  getReminderPermission,
  getReminderStatusLabel,
  requestReminderPermission,
  runReminderCheck,
  syncRemindersToServiceWorker,
  type ReminderSettings,
} from "./reminders";
import { ReportScreen } from "./ReportScreen";
import "./styles.css";

type TabId = "dashboard" | "plan" | "library" | "progress" | "nutrition";

type ExerciseContext = {
  exerciseId: string;
  workoutId?: WorkoutId;
  week?: number;
  volume?: string;
  load?: string;
  cue?: string;
};

type MuscleZone = "shoulders" | "chest" | "upperBack" | "lats" | "arms" | "core" | "glutes" | "hamstrings" | "quads" | "calves";

const INSTALL_DISMISS_KEY = "angelika-pwa-install-dismissed";
const ACTIVE_WORKOUT_SESSION_KEY = "angelika-active-workout-session-v1";
const weeks = Array.from({ length: 8 }, (_, index) => index + 1);
const workoutDayOffsets = [0, 2, 4, 5] as const;
const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const categoryFilters: Array<ExerciseCategory | "Все"> = ["Все", "Верх", "Ягодицы", "Кор", "Кардио"];
const muscleZoneLabels: Record<MuscleZone, string> = {
  shoulders: "плечи",
  chest: "грудь",
  upperBack: "верх спины",
  lats: "широчайшие",
  arms: "руки",
  core: "кор",
  glutes: "ягодицы",
  hamstrings: "задняя поверхность бедра",
  quads: "передняя поверхность бедра",
  calves: "голени",
};

function usePlannerStorage() {
  const [state, setState] = useState<PlannerMeta>(() => createDefaultMeta());
  const [photos, setPhotos] = useState<ProgressPhotoView[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPlannerData().then(({ meta, photos: loadedPhotos }) => {
      if (!active) {
        revokePhotoUrls(loadedPhotos);
        return;
      }
      setState(meta);
      setPhotos(loadedPhotos);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void savePlannerMeta(state);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => revokePhotoUrls(photosRef.current), []);

  return { state, setState, photos, setPhotos, ready } as const;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultState(): PlannerMeta {
  return createDefaultMeta();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function prefersExerciseSheet() {
  return !window.matchMedia("(min-width: 1280px)").matches;
}

function getCurrentWeek(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = Date.now() - start.getTime();
  return clamp(Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1, 1, 8);
}

function getInputDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getLocalDayKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getWorkoutDayOffset(workoutId: WorkoutId) {
  const index = workouts.findIndex((workout) => workout.id === workoutId);
  return workoutDayOffsets[index] ?? 0;
}

function getWorkoutDayLabel(workoutId: WorkoutId) {
  return `День ${getWorkoutDayOffset(workoutId) + 1}`;
}

function getWorkoutPlanDate(startDate: string, week: number, workoutId: WorkoutId) {
  const start = getInputDate(startDate);
  if (!start) return null;
  return addDays(start, (week - 1) * 7 + getWorkoutDayOffset(workoutId));
}

function formatPlanDate(date: Date | null) {
  if (!date) return "дата не задана";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatRelativePlanDate(date: Date | null) {
  if (!date) return "дата не задана";
  const diffDays = Math.round((getLocalDayKey(date) - getLocalDayKey(new Date())) / (24 * 60 * 60 * 1000));
  if (diffDays === -1) return "вчера";
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "завтра";
  return date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

function getWorkoutScheduleLabel(startDate: string, week: number, workoutId: WorkoutId) {
  const date = getWorkoutPlanDate(startDate, week, workoutId);
  return `${getWorkoutDayLabel(workoutId)} · ${formatRelativePlanDate(date)}`;
}

function getNextWorkout(completed: Record<string, boolean>, currentWeek: number) {
  const current = workouts.find((workout) => !completed[getWorkoutKey(currentWeek, workout.id)]);
  if (current) return { workout: current, week: currentWeek };
  return { workout: workouts[0], week: clamp(currentWeek + 1, 1, 8) };
}

function getProgress(completed: Record<string, boolean>) {
  const total = workouts.length * weeks.length;
  const done = weeks.reduce(
    (sum, week) => sum + workouts.filter((workout) => completed[getWorkoutKey(week, workout.id)]).length,
    0,
  );
  return { total, done, percent: Math.round((done / total) * 100) };
}

function parseMeasurementValue(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getBaselineMeasurement(measurements: Measurement[]) {
  const week1 = measurements.find((item) => item.week === 1);
  return {
    weight: parseMeasurementValue(week1?.weight ?? "") ?? profile.weight,
    waist: parseMeasurementValue(week1?.waist ?? "") ?? profile.waist,
    hips: parseMeasurementValue(week1?.hips ?? "") ?? profile.hips,
  };
}

function getLatestMeasurement(measurements: Measurement[]) {
  return [...measurements]
    .reverse()
    .find((item) => item.weight || item.waist || item.belly || item.hips);
}

function formatMeasurementDelta(current: number, baseline: number, unit: string) {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.05) return null;
  const sign = diff > 0 ? "+" : "−";
  const value = Math.abs(diff);
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
  return `${sign}${formatted} ${unit}`;
}

function formatBodySummary(measurements: Measurement[]) {
  const latest = getLatestMeasurement(measurements);
  const baseline = getBaselineMeasurement(measurements);
  const weight = latest ? parseMeasurementValue(latest.weight) : null;
  const waist = latest ? parseMeasurementValue(latest.waist) : null;
  const hips = latest ? parseMeasurementValue(latest.hips) : null;

  const value = `${weight ?? baseline.weight} кг · талия ${waist ?? baseline.waist} см`;
  if (!latest) {
    return { value, sub: "стартовые данные" };
  }

  const parts = [`неделя ${latest.week}`];
  if (weight !== null) {
    const delta = formatMeasurementDelta(weight, baseline.weight, "кг");
    if (delta) parts.push(`${delta} от старта`);
  }
  if (waist !== null) {
    const delta = formatMeasurementDelta(waist, baseline.waist, "см");
    if (delta) parts.push(`талия ${delta}`);
  }
  if (hips !== null) {
    const delta = formatMeasurementDelta(hips, baseline.hips, "см");
    if (delta) parts.push(`бёдра ${delta}`);
  }

  return { value, sub: parts.join(" · ") };
}

function formatLatestMeasurementDetails(measurements: Measurement[]) {
  const latest = getLatestMeasurement(measurements);
  if (!latest) return "пока нет данных";

  const parts: string[] = [`неделя ${latest.week}`];
  const weight = parseMeasurementValue(latest.weight);
  const waist = parseMeasurementValue(latest.waist);
  const belly = parseMeasurementValue(latest.belly);
  const hips = parseMeasurementValue(latest.hips);

  if (weight !== null) parts.push(`${weight} кг`);
  if (waist !== null) parts.push(`талия ${waist} см`);
  if (belly !== null) parts.push(`живот ${belly} см`);
  if (hips !== null) parts.push(`бёдра ${hips} см`);

  return parts.join(" · ");
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function App() {
  const { state, setState, photos, setPhotos, ready } = usePlannerStorage();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [activeWorkoutId, setActiveWorkoutId] = useState<WorkoutId>("upper-a");
  const [activeExerciseId, setActiveExerciseId] = useState(exercises[0].id);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState<ExerciseCategory | "Все">("Все");
  const [newPlaylistUrl, setNewPlaylistUrl] = useState("");
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [exerciseSheet, setExerciseSheet] = useState<ExerciseContext | null>(null);
  const [workoutSession, setWorkoutSession] = useState<{ workoutId: WorkoutId; week: number } | null>(() => readSavedWorkoutSession());
  const [reportOpen, setReportOpen] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [installVisible, setInstallVisible] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(() => localStorage.getItem(INSTALL_DISMISS_KEY) === "1");
  const [iosInstallHint, setIosInstallHint] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const updateSwRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined);
  const [reminderPermission, setReminderPermission] = useState(getReminderPermission);

  useEffect(() => {
    if (!ready) return;
    setState((current) => runReminderCheck(current));
  }, [ready]);

  useEffect(() => {
    if (!ready || !state.reminders.enabled) return;

    const tick = () => setState((current) => runReminderCheck(current));
    tick();
    const intervalId = window.setInterval(tick, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, state.reminders.enabled]);

  useEffect(() => {
    if (!ready) return;
    void syncRemindersToServiceWorker(state);
  }, [ready, state.reminders, state.reminderMarks, state.startDate]);

  useEffect(() => {
    updateSwRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
  }, []);

  useEffect(() => {
    function goOffline() {
      setIsOffline(true);
    }
    function goOnline() {
      setIsOffline(false);
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneApp() || installDismissed) return;
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [installDismissed]);

  useEffect(() => {
    if (installDismissed || isStandaloneApp()) return;
    if (deferredInstallPrompt || isIosDevice()) {
      setInstallVisible(true);
    }
  }, [deferredInstallPrompt, installDismissed]);

  const canInstallApp = !isStandaloneApp() && (Boolean(deferredInstallPrompt) || isIosDevice());

  async function runInstallApp() {
    if (!deferredInstallPrompt) {
      setIosInstallHint(true);
      setInstallVisible(true);
      return;
    }
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredInstallPrompt(null);
      setInstallDismissed(true);
      localStorage.setItem(INSTALL_DISMISS_KEY, "1");
      setInstallVisible(false);
    }
  }

  function dismissInstallPrompt() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setInstallDismissed(true);
    setInstallVisible(false);
  }

  function openInstallPrompt() {
    setInstallVisible(true);
    setIosInstallHint(!deferredInstallPrompt && isIosDevice());
  }

  function selectLibraryExercise(id: string) {
    setActiveExerciseId(id);
    if (prefersExerciseSheet()) {
      setExerciseSheet({ exerciseId: id });
    }
  }

  const currentWeek = getCurrentWeek(state.startDate);
  const progress = getProgress(state.completed);
  const next = getNextWorkout(state.completed, currentWeek);
  const activeWorkout = workoutById.get(activeWorkoutId) ?? workouts[0];
  const activeExercise = exerciseById.get(activeExerciseId) ?? exercises[0];

  const filteredExercises = useMemo(() => {
    const query = exerciseQuery.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const byCategory = exerciseCategory === "Все" || exercise.category === exerciseCategory;
      const byQuery =
        !query ||
        exercise.name.toLowerCase().includes(query) ||
        exercise.muscles.toLowerCase().includes(query) ||
        exercise.equipment.join(" ").toLowerCase().includes(query);
      return byCategory && byQuery;
    });
  }, [exerciseCategory, exerciseQuery]);

  function updateState(update: (current: PlannerMeta) => PlannerMeta) {
    setState((current) => update(current));
  }

  function updateWeightLog(week: number, exerciseId: string, value: string) {
    updateState((current) => ({
      ...current,
      weightLogs: { ...current.weightLogs, [getWeightLogKey(week, exerciseId)]: value },
    }));
  }

  function toggleWorkout(week: number, workoutId: WorkoutId) {
    updateState((current) => {
      const key = getWorkoutKey(week, workoutId);
      return { ...current, completed: { ...current.completed, [key]: !current.completed[key] } };
    });
  }

  function updateReminders(update: Partial<ReminderSettings>) {
    void (async () => {
      if (update.enabled && getReminderPermission() !== "granted") {
        const permission = await requestReminderPermission();
        setReminderPermission(permission);
        if (permission !== "granted") return;
      }
      updateState((current) => ({
        ...current,
        reminders: { ...current.reminders, ...update },
      }));
    })();
  }

  function updateMeasurement(week: number, field: keyof Omit<Measurement, "week">, value: string) {
    updateState((current) => ({
      ...current,
      measurements: current.measurements.map((item) => (item.week === week ? { ...item, [field]: value } : item)),
    }));
  }

  function toggleShopping(item: string) {
    updateState((current) => ({
      ...current,
      shopping: { ...current.shopping, [item]: !current.shopping[item] },
    }));
  }

  function selectMeal(mealId: string, optionId: string) {
    updateState((current) => ({
      ...current,
      selectedMeals: { ...current.selectedMeals, [mealId]: optionId },
    }));
  }

  function addExtraFood(item: Omit<ExtraFoodItem, "id">) {
    updateState((current) => ({
      ...current,
      extraFood: [...current.extraFood, { ...item, id: crypto.randomUUID() }],
    }));
  }

  function removeExtraFood(id: string) {
    updateState((current) => ({
      ...current,
      extraFood: current.extraFood.filter((item) => item.id !== id),
    }));
  }

  function updateExtraFoodGrams(id: string, grams: number) {
    const safeGrams = clamp(Math.round(grams), 1, 2000);
    updateState((current) => ({
      ...current,
      extraFood: current.extraFood.map((item) => {
        if (item.id !== id || !item.per100g) return item;
        const scaled = nutrientsForGrams(item.per100g, safeGrams);
        return { ...item, grams: safeGrams, ...scaled };
      }),
    }));
  }

  function setUseMenuToday(value: boolean) {
    updateState((current) => ({ ...current, useMenuToday: value }));
  }

  function addPlaylist() {
    const url = newPlaylistUrl.trim();
    if (!url) return;
    const title = newPlaylistTitle.trim() || "Мой плейлист";
    updateState((current) => ({
      ...current,
      playlists: [
        ...current.playlists,
        {
          id: crypto.randomUUID(),
          title,
          mood: "добавлено вручную",
          bpm: "по настроению",
          url,
        },
      ],
    }));
    setNewPlaylistTitle("");
    setNewPlaylistUrl("");
  }

  function removePlaylist(id: string) {
    updateState((current) => ({ ...current, playlists: current.playlists.filter((playlist) => playlist.id !== id) }));
  }

  async function onPhotoUpload(event: ChangeEvent<HTMLInputElement>, label: string, week: number) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    try {
      const uploadedPhotos = await Promise.all(files.map((file) => addPlannerPhoto(file, label, week)));
      setPhotos((current) => [...uploadedPhotos, ...current].slice(0, 48));
    } catch {
      alert("Не удалось сохранить фото.");
    }
    event.target.value = "";
  }

  async function removePhoto(id: string) {
    const target = photos.find((photo) => photo.id === id);
    if (target?.src.startsWith("blob:")) URL.revokeObjectURL(target.src);
    await removePlannerPhoto(id);
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function exportProgress() {
    const payload = await buildExportPayload(state, photos);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `angelika-progress-week-${currentWeek}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as ExportPayload;
          if (!parsed.state) throw new Error("Invalid export");
          revokePhotoUrls(photos);
          const imported = await importPlannerPayload(parsed);
          setState(imported.meta);
          setPhotos(imported.photos);
        } catch {
          alert("Не удалось загрузить прогресс.");
        }
      })();
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const workoutDone = Boolean(state.completed[getWorkoutKey(next.week, next.workout.id)]);
  const reportExerciseNames = useMemo(
    () =>
      Object.fromEntries(
        journalExerciseIds.map((exerciseId) => [exerciseId, exerciseById.get(exerciseId)?.name ?? exerciseId]),
      ),
    [],
  );

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#080907] px-6 text-center text-stone-400">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-lime-300" />
          <p className="mt-4 text-sm">Загружаю данные…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080907] text-stone-50">
      <div className="mx-auto flex w-full max-w-[1440px] gap-0 overflow-x-hidden lg:gap-6">
        <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-[#0d0f0b]/90 px-5 py-6 lg:block">
          <Brand />
          <DesktopNav activeTab={activeTab} onChange={setActiveTab} />
        </aside>

        <main className="mobile-shell mx-auto min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          <PwaStatusBar
            isOffline={isOffline}
            needRefresh={needRefresh}
            onRefresh={() => void updateSwRef.current?.(true)}
          />
          <MobileHeader activeTab={activeTab} />

          {activeTab === "dashboard" && (
            <Dashboard
              currentWeek={currentWeek}
              progress={progress}
              nextWorkout={next.workout}
              nextWeek={next.week}
              workoutDone={workoutDone}
              state={state}
              photos={photos}
              onToggleWorkout={() => toggleWorkout(next.week, next.workout.id)}
              onOpenExercise={setExerciseSheet}
              onStartDateChange={(value) => updateState((current) => ({ ...current, startDate: value }))}
              onStartWorkout={() => setWorkoutSession({ workoutId: next.workout.id, week: next.week })}
              onExport={exportProgress}
              onImport={() => importRef.current?.click()}
              canInstallApp={canInstallApp}
              onInstallApp={openInstallPrompt}
              reminderPermission={reminderPermission}
              onUpdateReminders={updateReminders}
            />
          )}

          {activeTab === "plan" && (
            <TrainingPlan
              activeWorkout={activeWorkout}
              activeWorkoutId={activeWorkoutId}
              completed={state.completed}
              currentWeek={currentWeek}
              startDate={state.startDate}
              newPlaylistTitle={newPlaylistTitle}
              newPlaylistUrl={newPlaylistUrl}
              playlists={state.playlists}
              weightLogs={state.weightLogs}
              onAddPlaylist={addPlaylist}
              onNewPlaylistTitle={setNewPlaylistTitle}
              onNewPlaylistUrl={setNewPlaylistUrl}
              onOpenExercise={setExerciseSheet}
              onRemovePlaylist={removePlaylist}
              onSelectWorkout={setActiveWorkoutId}
              onStartWorkout={() => setWorkoutSession({ workoutId: activeWorkoutId, week: currentWeek })}
              onToggleWorkout={toggleWorkout}
              onWeightLogChange={updateWeightLog}
            />
          )}

          {activeTab === "library" && (
            <ExerciseLibrary
              activeExercise={activeExercise}
              activeExerciseId={activeExerciseId}
              category={exerciseCategory}
              exercises={filteredExercises}
              query={exerciseQuery}
              onCategoryChange={setExerciseCategory}
              onQueryChange={setExerciseQuery}
              onSelectExercise={selectLibraryExercise}
            />
          )}

          {activeTab === "progress" && (
            <ProgressPanel
              currentWeek={currentWeek}
              measurements={state.measurements}
              photos={photos}
              weightLogs={state.weightLogs}
              onMeasurementChange={updateMeasurement}
              onOpenReport={() => setReportOpen(true)}
              onPhotoUpload={onPhotoUpload}
              onRemovePhoto={removePhoto}
              onWeightLogChange={updateWeightLog}
            />
          )}

          {activeTab === "nutrition" && (
            <NutritionPanel
              extraFood={state.extraFood}
              selectedMeals={state.selectedMeals}
              shopping={state.shopping}
              useMenuToday={state.useMenuToday}
              onAddExtraFood={addExtraFood}
              onRemoveExtraFood={removeExtraFood}
              onSelectMeal={selectMeal}
              onSetUseMenuToday={setUseMenuToday}
              onToggleShopping={toggleShopping}
              onUpdateExtraFoodGrams={updateExtraFoodGrams}
            />
          )}

          <input ref={importRef} className="hidden" type="file" accept="application/json" onChange={importProgress} />
        </main>
      </div>

      <InstallPrompt
        canPromptInstall={canInstallApp}
        hidden={Boolean(workoutSession) || reportOpen}
        iosHint={iosInstallHint}
        visible={installVisible}
        onDismiss={dismissInstallPrompt}
        onInstall={() => void runInstallApp()}
      />
      {!reportOpen && !workoutSession && <BottomNav activeTab={activeTab} onChange={setActiveTab} />}
      {exerciseSheet && <ExerciseDetailSheet context={exerciseSheet} onClose={() => setExerciseSheet(null)} />}
      {workoutSession && (
        <WorkoutSession
          week={workoutSession.week}
          workout={workoutById.get(workoutSession.workoutId) ?? workouts[0]}
          onClose={() => setWorkoutSession(null)}
          onComplete={() => {
            toggleWorkout(workoutSession.week, workoutSession.workoutId);
            clearSavedWorkoutSession();
            setWorkoutSession(null);
          }}
          onDiscard={() => {
            clearSavedWorkoutSession();
            setWorkoutSession(null);
          }}
        />
      )}
      {reportOpen && (
        <ReportScreen
          currentWeek={currentWeek}
          exerciseNames={reportExerciseNames}
          photos={photos}
          progress={progress}
          state={state}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-stone-950 shadow-[0_0_28px_rgba(190,242,100,0.28)]">
        <Activity size={22} strokeWidth={2.6} />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-400">План тренировок</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">Анжелика</h1>
      </div>
    </div>
  );
}

function DesktopNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  const items = getNavItems();
  return (
    <nav className="mt-8 grid gap-2">
      {items.map((item) => (
        <button
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
            activeTab === item.id ? "bg-white text-stone-950" : "text-stone-400 hover:bg-white/5 hover:text-white",
          )}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <item.Icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function MobileHeader({ activeTab }: { activeTab: TabId }) {
  const current = getNavItems().find((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-30 mb-5 border-b border-white/10 bg-[#080907]/88 py-3 backdrop-blur-xl lg:hidden">
      <div className="min-w-0">
        <Brand />
        {current && <p className="mt-1 truncate text-sm text-stone-500">{current.label}</p>}
      </div>
    </header>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function PwaStatusBar({
  isOffline,
  needRefresh,
  onRefresh,
}: {
  isOffline: boolean;
  needRefresh: boolean;
  onRefresh: () => void;
}) {
  if (!isOffline && !needRefresh) return null;

  return (
    <div className="mb-4 grid gap-2">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-stone-300">
          <WifiOff className="shrink-0 text-stone-500" size={16} />
          Офлайн — план, прогресс и загруженные GIF доступны из кэша
        </div>
      )}
      {needRefresh && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-lime-300/10 px-3 py-2 text-sm text-lime-100">
          <span>Доступна новая версия приложения</span>
          <button className="shrink-0 font-semibold text-lime-300" onClick={onRefresh} type="button">
            Обновить
          </button>
        </div>
      )}
    </div>
  );
}

function InstallPrompt({
  canPromptInstall,
  hidden,
  iosHint,
  onDismiss,
  onInstall,
  visible,
}: {
  canPromptInstall: boolean;
  hidden?: boolean;
  iosHint: boolean;
  onDismiss: () => void;
  onInstall: () => void;
  visible: boolean;
}) {
  if (hidden || !visible || isStandaloneApp() || !canPromptInstall) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-30 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[min(100vw-2rem,360px)]">
      <div className="rounded-2xl bg-[#151811]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300 text-stone-950">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Установить на экран</p>
            <p className="mt-1 text-xs leading-5 text-stone-400">
              {iosHint
                ? "Safari → Поделиться → «На экран Домой». План и GIF будут доступны офлайн."
                : "Открывай план как приложение — быстрее и работает без интернета."}
            </p>
          </div>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-white/[0.06] hover:text-white"
            onClick={onDismiss}
            type="button"
            aria-label="Скрыть"
          >
            <X size={16} />
          </button>
        </div>
        {!iosHint && (
          <button className="mt-3 w-full rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950" onClick={onInstall} type="button">
            Установить
          </button>
        )}
      </div>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-white/10 bg-[#10120d]/92 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {getNavItems().map((item) => (
          <button
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
              activeTab === item.id ? "bg-lime-300 text-stone-950" : "text-stone-400",
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <item.Icon size={18} />
            <span className="max-w-full truncate">{item.short}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function getNavItems(): Array<{ id: TabId; label: string; short: string; Icon: LucideIcon }> {
  return [
    { id: "dashboard", label: "Главная", short: "Дом", Icon: Home },
    { id: "plan", label: "Тренировки", short: "План", Icon: Dumbbell },
    { id: "library", label: "Библиотека", short: "База", Icon: Library },
    { id: "progress", label: "Прогресс", short: "Тело", Icon: Ruler },
    { id: "nutrition", label: "Питание", short: "Еда", Icon: Apple },
  ];
}

function Dashboard({
  currentWeek,
  progress,
  nextWorkout,
  nextWeek,
  workoutDone,
  photos,
  state,
  onToggleWorkout,
  onOpenExercise,
  onStartDateChange,
  onStartWorkout,
  onExport,
  onImport,
  canInstallApp,
  onInstallApp,
  reminderPermission,
  onUpdateReminders,
}: {
  currentWeek: number;
  progress: { total: number; done: number; percent: number };
  nextWorkout: Workout;
  nextWeek: number;
  workoutDone: boolean;
  photos: ProgressPhotoView[];
  state: PlannerMeta;
  onToggleWorkout: () => void;
  onOpenExercise: (context: ExerciseContext) => void;
  onStartDateChange: (value: string) => void;
  onStartWorkout: () => void;
  onExport: () => void;
  onImport: () => void;
  canInstallApp: boolean;
  onInstallApp: () => void;
  reminderPermission: NotificationPermission | "unsupported";
  onUpdateReminders: (update: Partial<ReminderSettings>) => void;
}) {
  const latestPhoto = photos[0];
  const bodySummary = formatBodySummary(state.measurements);
  const nextWorkoutDate = getWorkoutPlanDate(state.startDate, nextWeek, nextWorkout.id);
  const nextWorkoutSchedule = getWorkoutScheduleLabel(state.startDate, nextWeek, nextWorkout.id);

  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_78%_18%,rgba(190,242,100,0.16),transparent_28%),linear-gradient(135deg,#151811,#0b0d09)] p-5 shadow-2xl sm:p-7">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-coral blur-3xl opacity-25" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-lime-200">Следующая по плану</p>
              <h2 className="mt-2 max-w-2xl text-[2.25rem] font-semibold leading-[1] tracking-[-0.04em] text-white sm:text-5xl">
                {nextWorkout.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
                {nextWorkout.focus} · {nextWorkout.duration}
              </p>
              <p className="mt-2 text-sm font-semibold text-lime-100">
                {nextWorkoutSchedule} · {formatPlanDate(nextWorkoutDate)}
              </p>
              <p className="mt-3 text-sm text-stone-400 sm:hidden">
                {bodySummary.value}
                <span className="mt-1 block text-stone-500">{bodySummary.sub}</span>
              </p>
            </div>
            <ProgressRing percent={progress.percent} label={`${progress.done}/${progress.total}`} />
          </div>

          <div className="relative z-10 mt-6 hidden min-w-0 gap-3 sm:grid md:grid-cols-2">
            <SummaryPill icon={CalendarDays} label="Неделя" value={`${currentWeek} из 8`} sub="" />
            <SummaryPill icon={Scale} label="Тело" value={bodySummary.value} sub={bodySummary.sub} />
            <SummaryPill icon={Salad} label="Питание" value={profile.calories} sub={profile.macros} />
            <SummaryPill icon={Dumbbell} label="Формат" value="4 тренировки" sub="в неделю" />
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-stone-400">Ближайшая тренировка</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">{nextWorkout.title}</h3>
              <p className="mt-2 text-sm text-lime-200">{nextWorkoutSchedule}</p>
            </div>
            <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-bold text-stone-950">Неделя {nextWeek}</span>
          </div>
          <p className="mt-3 text-sm text-stone-400">{nextWorkout.duration}</p>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200"
            onClick={onStartWorkout}
            type="button"
          >
            <Play size={18} />
            Начать тренировку
          </button>
          <div className="mt-5 grid gap-3">
            {nextWorkout.exercises.slice(0, 5).map((item) => {
              const exercise = exerciseById.get(item.exerciseId);
              return (
                <button
                  className="flex items-center justify-between rounded-2xl bg-black/24 px-4 py-3 text-left transition hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-lime-300/50"
                  key={item.exerciseId}
                  onClick={() =>
                    onOpenExercise({
                      exerciseId: item.exerciseId,
                      workoutId: nextWorkout.id,
                      week: nextWeek,
                      volume: item.volume,
                      load: item.load,
                      cue: item.cue,
                    })
                  }
                  type="button"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{exercise?.name}</p>
                    <p className="text-xs text-stone-400">{item.volume} · {item.load}</p>
                  </div>
                  <ChevronRight className="text-stone-500" size={18} />
                </button>
              );
            })}
          </div>
          <button
            className={cn(
              "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
              workoutDone
                ? "border border-lime-300/35 bg-lime-300/12 text-lime-100"
                : "bg-lime-300 text-stone-950 hover:bg-lime-200",
            )}
            onClick={onToggleWorkout}
            type="button"
          >
            <Check size={18} />
            {workoutDone ? "Выполнена · снять отметку" : "Отметить выполненной"}
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Календарь недели" icon={CalendarDays}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {workouts.map((workout) => {
              const done = Boolean(state.completed[getWorkoutKey(currentWeek, workout.id)]);
              const planDate = getWorkoutPlanDate(state.startDate, currentWeek, workout.id);
              return (
                <div
                  className={cn(
                    "min-w-0 rounded-[22px] border p-3.5 sm:p-3",
                    done ? "border-lime-300/30 bg-lime-300/12" : "border-white/10 bg-white/[0.04]",
                  )}
                  key={workout.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-lime-200">{getWorkoutScheduleLabel(state.startDate, currentWeek, workout.id)}</p>
                    {done && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime-300 text-stone-950">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug text-white">{workout.title}</p>
                  <p className="mt-1.5 text-xs text-stone-500">
                    {formatPlanDate(planDate)} · {workout.duration}
                  </p>
                </div>
              );
            })}
          </div>
          <label className="mt-5 block text-sm text-stone-400">
            Дата старта плана
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              type="date"
              value={state.startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
            <span className="mt-2 block text-xs leading-5 text-stone-500">
              Расписание считается от этой даты: День 1, День 3, День 5 и День 6 каждой недели.
            </span>
          </label>
        </Panel>

        <Panel title="Тело и фото" icon={Images}>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <MiniChart measurements={state.measurements} fields={["weight", "waist", "hips"]} compact />
              <p className="mt-3 text-sm text-stone-400">{formatLatestMeasurementDetails(state.measurements)}</p>
            </div>
            <div className="aspect-[4/5] overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04]">
              {latestPhoto ? (
                <img className="h-full w-full object-cover" src={latestPhoto.src} alt={latestPhoto.label} />
              ) : (
                <div className="grid h-full place-items-center p-4 text-center text-sm text-stone-500">
                  Пока нет фото
                </div>
              )}
            </div>
          </div>
        </Panel>
      </section>

      <RemindersPanel
        reminders={state.reminders}
        permission={reminderPermission}
        statusLabel={getReminderStatusLabel(state)}
        onUpdate={onUpdateReminders}
      />

      <section className="grid gap-3 sm:grid-cols-2">
        {canInstallApp && (
          <ActionButton
            icon={Smartphone}
            label="Установить приложение"
            sub="на экран домой · офлайн-доступ"
            onClick={onInstallApp}
          />
        )}
        <ActionButton icon={Download} label="Скачать прогресс" sub="файл для резервной копии" onClick={onExport} />
        <ActionButton icon={FileUp} label="Загрузить прогресс" sub="из сохранённого файла" onClick={onImport} />
      </section>
    </div>
  );
}

function RemindersPanel({
  reminders,
  permission,
  statusLabel,
  onUpdate,
}: {
  reminders: ReminderSettings;
  permission: NotificationPermission | "unsupported";
  statusLabel: string;
  onUpdate: (update: Partial<ReminderSettings>) => void;
}) {
  const blocked = permission === "denied" || permission === "unsupported";

  return (
    <Panel title="Напоминания" icon={Bell}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-stone-300">
            «Сегодня ягодицы» в дни тренировок · «Неделя N — замеры» по понедельникам
          </p>
          <p className="mt-2 text-xs text-stone-500">{statusLabel}</p>
        </div>
        <label className="flex shrink-0 items-center gap-3 text-sm text-stone-300">
          <span>Включить</span>
          <button
            aria-checked={reminders.enabled}
            className={cn(
              "relative h-7 w-12 rounded-full transition",
              reminders.enabled ? "bg-lime-300" : "bg-white/10",
              blocked && "opacity-50",
            )}
            disabled={blocked}
            onClick={() => onUpdate({ enabled: !reminders.enabled })}
            role="switch"
            type="button"
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                reminders.enabled ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-stone-400">
          Тренировка
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60 disabled:opacity-50"
            disabled={!reminders.enabled}
            onChange={(event) => onUpdate({ workoutTime: event.target.value })}
            type="time"
            value={reminders.workoutTime}
          />
        </label>
        <label className="block text-sm text-stone-400">
          Замеры (понедельник)
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60 disabled:opacity-50"
            disabled={!reminders.enabled}
            onChange={(event) => onUpdate({ measureTime: event.target.value })}
            type="time"
            value={reminders.measureTime}
          />
        </label>
      </div>
    </Panel>
  );
}

type CircuitPhase = "idle" | "work" | "exercise-rest" | "round-rest" | "done";

type CircuitRuntime = {
  phase: CircuitPhase;
  round: number;
  exerciseIndex: number;
  secondsLeft: number;
  manualWork: boolean;
  paused: boolean;
};

function parseWorkDuration(volume: string) {
  const secMatch = volume.match(/(\d+)\s*сек/i);
  if (secMatch) return { mode: "time" as const, seconds: Number(secMatch[1]) };
  return { mode: "reps" as const, label: volume };
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function playCircuitTone(audioContext: AudioContext, frequency: number, durationMs: number, volume = 0.22) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  const start = audioContext.currentTime;
  oscillator.start(start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  oscillator.stop(start + durationMs / 1000 + 0.02);
}

function playRoundCompleteSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 880, 180);
  window.setTimeout(() => playCircuitTone(audioContext, 660, 240), 220);
}

function playWorkoutCompleteSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 880, 160);
  window.setTimeout(() => playCircuitTone(audioContext, 880, 160), 200);
  window.setTimeout(() => playCircuitTone(audioContext, 660, 280), 420);
}

function playRestEndSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 620, 120);
}

function vibrate(pattern: VibratePattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function createWorkState(workout: Workout, round: number, exerciseIndex: number): CircuitRuntime {
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

function CircuitTimer({ workout }: { workout: Workout }) {
  const circuit = workout.circuit!;
  const audioRef = useRef<AudioContext | null>(null);
  const [runtime, setRuntime] = useState<CircuitRuntime>({
    phase: "idle",
    round: 1,
    exerciseIndex: 0,
    secondsLeft: 0,
    manualWork: false,
    paused: false,
  });

  const currentItem = workout.exercises[runtime.exerciseIndex];
  const currentExercise = currentItem ? exerciseById.get(currentItem.exerciseId) : undefined;
  const parsedWork = currentItem ? parseWorkDuration(currentItem.volume) : null;
  const totalExercises = workout.exercises.length;

  function ensureAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }

  function startCircuit() {
    ensureAudio();
    setRuntime(createWorkState(workout, 1, 0));
  }

  function resetCircuit() {
    setRuntime({
      phase: "idle",
      round: 1,
      exerciseIndex: 0,
      secondsLeft: 0,
      manualWork: false,
      paused: false,
    });
  }

  function togglePause() {
    setRuntime((current) => ({ ...current, paused: !current.paused }));
  }

  function getAfterWorkState(current: CircuitRuntime): CircuitRuntime {
    const isLastExercise = current.exerciseIndex >= totalExercises - 1;
    const isLastRound = current.round >= circuit.rounds;

    if (!isLastExercise) {
      return {
        phase: "exercise-rest",
        round: current.round,
        exerciseIndex: current.exerciseIndex,
        secondsLeft: circuit.exerciseRestSec,
        manualWork: false,
        paused: false,
      };
    }

    if (!isLastRound) {
      return {
        phase: "round-rest",
        round: current.round,
        exerciseIndex: current.exerciseIndex,
        secondsLeft: circuit.roundRestSec,
        manualWork: false,
        paused: false,
      };
    }

    return {
      phase: "done",
      round: current.round,
      exerciseIndex: current.exerciseIndex,
      secondsLeft: 0,
      manualWork: false,
      paused: false,
    };
  }

  function finishWork() {
    setRuntime((current) => {
      const next = getAfterWorkState(current);
      if (next.phase === "round-rest") playRoundCompleteSound(ensureAudio());
      if (next.phase === "done") playWorkoutCompleteSound(ensureAudio());
      return next;
    });
  }

  function skipRest() {
    setRuntime((current) => {
      if (current.phase === "exercise-rest") {
        return createWorkState(workout, current.round, current.exerciseIndex + 1);
      }
      if (current.phase === "round-rest") {
        return createWorkState(workout, current.round + 1, 0);
      }
      return current;
    });
  }

  useEffect(() => {
    if (runtime.paused || runtime.phase === "idle" || runtime.phase === "done" || (runtime.phase === "work" && runtime.manualWork)) {
      return;
    }

    const timer = window.setInterval(() => {
      setRuntime((current) => {
        if (current.paused || current.secondsLeft <= 0) return current;

        if (current.secondsLeft === 1) {
          if (current.phase === "work") {
            const next = getAfterWorkState(current);
            if (next.phase === "round-rest") playRoundCompleteSound(ensureAudio());
            if (next.phase === "done") playWorkoutCompleteSound(ensureAudio());
            return next;
          }

          if (audioRef.current) playRestEndSound(audioRef.current);

          if (current.phase === "exercise-rest") {
            return createWorkState(workout, current.round, current.exerciseIndex + 1);
          }
          if (current.phase === "round-rest") {
            return createWorkState(workout, current.round + 1, 0);
          }
        }

        return { ...current, secondsLeft: current.secondsLeft - 1 };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [runtime.phase, runtime.paused, runtime.manualWork, runtime.round, runtime.exerciseIndex, workout, circuit, totalExercises]);

  const phaseLabel =
    runtime.phase === "work"
      ? runtime.manualWork
        ? "Сделай повторы и нажми «Готово»"
        : "Работа"
      : runtime.phase === "exercise-rest"
        ? "Отдых между упражнениями"
        : runtime.phase === "round-rest"
          ? "Перерыв между кругами"
          : runtime.phase === "done"
            ? "Круговая готова"
            : "Готов к старту";

  const timerValue =
    runtime.phase === "work" && runtime.manualWork
      ? parsedWork?.mode === "reps"
        ? parsedWork.label
        : "—"
      : runtime.phase === "idle"
        ? `${circuit.rounds}x${totalExercises}`
        : formatClock(runtime.secondsLeft);

  return (
    <Panel title="Круговой таймер" icon={Timer} right={`${circuit.rounds} круга`}>
      <div
        className={cn(
          "rounded-[28px] p-5 text-center transition",
          runtime.phase === "round-rest"
            ? "bg-coral/15"
            : runtime.phase === "done"
              ? "bg-lime-300 text-stone-950"
              : "bg-black/25",
        )}
      >
        <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", runtime.phase === "done" ? "opacity-70" : "text-lime-200")}>
          {phaseLabel}
        </p>
        <p
          className={cn(
            "mt-3 font-semibold tracking-[-0.05em]",
            runtime.phase === "work" && runtime.manualWork ? "text-4xl" : "text-6xl",
            runtime.phase === "done" ? "text-stone-950" : "text-white",
          )}
        >
          {timerValue}
        </p>
        {runtime.phase !== "idle" && runtime.phase !== "done" && currentExercise && (
          <div className="mt-4 text-left">
            <p className="text-sm font-semibold text-white">
              Круг {runtime.round}/{circuit.rounds} · упражнение {runtime.exerciseIndex + 1}/{totalExercises}
            </p>
            <p className="mt-1 text-lg font-semibold text-lime-200">{currentExercise.name}</p>
            {currentItem && (
              <p className="mt-2 text-sm leading-6 text-stone-400">
                {currentItem.volume} · {currentItem.load} · {currentItem.cue}
              </p>
            )}
          </div>
        )}
        {runtime.phase === "done" && (
          <p className="mt-3 text-sm font-semibold">Готово. Отметь тренировку выполненной.</p>
        )}
        {runtime.phase === "round-rest" && (
          <p className="mt-3 text-sm leading-6 text-coral-light">Круг завершён</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {runtime.phase === "idle" && (
          <button
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-bold text-stone-950"
            onClick={startCircuit}
            type="button"
          >
            <Play size={16} /> Старт круговой
          </button>
        )}
        {runtime.phase === "work" && runtime.manualWork && (
          <button className="col-span-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-bold text-stone-950" onClick={finishWork} type="button">
            Готово
          </button>
        )}
        {(runtime.phase === "exercise-rest" || runtime.phase === "round-rest") && (
          <button className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white" onClick={skipRest} type="button">
            Пропустить отдых
          </button>
        )}
        {runtime.phase !== "idle" && runtime.phase !== "done" && (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
            onClick={togglePause}
            type="button"
          >
            {runtime.paused ? <Play size={16} /> : <Pause size={16} />}
            {runtime.paused ? "Продолжить" : "Пауза"}
          </button>
        )}
        {runtime.phase !== "idle" && (
          <button
            className={cn(
              "rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white",
              runtime.phase === "done" && "col-span-2",
            )}
            onClick={resetCircuit}
            type="button"
          >
            Сброс
          </button>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-stone-500">
        Отдых {circuit.exerciseRestSec} сек между упражнениями, {circuit.roundRestSec} сек между кругами.
      </p>
    </Panel>
  );
}

function parseSetPlan(volume: string) {
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

const SET_REST_SEC = 90;
const BETWEEN_EXERCISE_REST_SEC = 75;

type SessionPhase =
  | "warmup"
  | "work"
  | "rest"
  | "circuit-work"
  | "circuit-exercise-rest"
  | "circuit-round-rest"
  | "done";

type SessionRuntime = {
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

const sessionPhases: SessionPhase[] = ["warmup", "work", "rest", "circuit-work", "circuit-exercise-rest", "circuit-round-rest", "done"];

function createInitialSessionRuntime(): SessionRuntime {
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

function readSavedWorkoutSession(): { workoutId: WorkoutId; week: number } | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedWorkoutSession>;
    if (saved.version !== 1 || typeof saved.workoutId !== "string" || typeof saved.week !== "number") return null;
    const workout = workoutById.get(saved.workoutId as WorkoutId);
    if (!workout || !isNumberInRange(saved.week, 1, weeks.length)) return null;
    if (!normalizeSavedRuntime(saved.runtime, workout)) return null;
    return { workoutId: saved.workoutId as WorkoutId, week: saved.week };
  } catch {
    return null;
  }
}

function readSavedWorkoutRuntime(workout: Workout, week: number): SessionRuntime | null {
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

function saveWorkoutSession(workout: Workout, week: number, runtime: SessionRuntime) {
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

function clearSavedWorkoutSession() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
  } catch {
    // Clearing workout progress is best-effort.
  }
}

function createCircuitWorkState(workout: Workout, round: number, exerciseIndex: number): Pick<SessionRuntime, "phase" | "circuitRound" | "exerciseIndex" | "workSecondsLeft" | "manualWork" | "restSecondsLeft"> {
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

function WorkoutSession({
  onClose,
  onComplete,
  onDiscard,
  week,
  workout,
}: {
  onClose: () => void;
  onComplete: () => void;
  onDiscard: () => void;
  week: number;
  workout: Workout;
}) {
  const isCircuit = Boolean(workout.circuit);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [runtime, setRuntime] = useState<SessionRuntime>(() => readSavedWorkoutRuntime(workout, week) ?? createInitialSessionRuntime());

  const circuit = workout.circuit;
  const totalExercises = workout.exercises.length;
  const currentItem = workout.exercises[runtime.exerciseIndex];
  const currentExercise = currentItem ? exerciseById.get(currentItem.exerciseId) : undefined;
  const setPlan = currentItem ? parseSetPlan(currentItem.volume) : { sets: 1, label: "", timedSeconds: undefined };
  const warmupStep = warmupSteps[runtime.warmupIndex];

  function ensureAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }

  function startStrengthWork(exerciseIndex: number, setNumber: number) {
    const item = workout.exercises[exerciseIndex];
    const plan = parseSetPlan(item.volume);
    if (plan.timedSeconds) {
      ensureAudio();
      setRuntime((current) => ({
        ...current,
        phase: "work",
        exerciseIndex,
        setNumber,
        workSecondsLeft: plan.timedSeconds!,
        manualWork: false,
        restSecondsLeft: 0,
        paused: false,
      }));
      return;
    }
    setRuntime((current) => ({
      ...current,
      phase: "work",
      exerciseIndex,
      setNumber,
      workSecondsLeft: 0,
      manualWork: true,
      restSecondsLeft: 0,
      paused: false,
    }));
  }

  function finishWarmupStep() {
    if (runtime.warmupIndex + 1 < warmupSteps.length) {
      setRuntime((current) => ({ ...current, warmupIndex: current.warmupIndex + 1 }));
      return;
    }
    if (isCircuit && circuit) {
      setRuntime((current) => ({ ...current, ...createCircuitWorkState(workout, 1, 0), paused: false }));
      ensureAudio();
      return;
    }
    startStrengthWork(0, 1);
  }

  function finishStrengthSet() {
    setRuntime((current) => {
      const plan = parseSetPlan(workout.exercises[current.exerciseIndex].volume);
      if (current.setNumber < plan.sets) {
        return {
          ...current,
          phase: "rest",
          restSecondsLeft: SET_REST_SEC,
          setNumber: current.setNumber + 1,
          paused: false,
        };
      }
      if (current.exerciseIndex + 1 < totalExercises) {
        return {
          ...current,
          phase: "rest",
          restSecondsLeft: BETWEEN_EXERCISE_REST_SEC,
          exerciseIndex: current.exerciseIndex + 1,
          setNumber: 1,
          paused: false,
        };
      }
      playWorkoutCompleteSound(ensureAudio());
      return { ...current, phase: "done", paused: false };
    });
  }

  function beginStrengthWork(current: SessionRuntime): SessionRuntime {
    const item = workout.exercises[current.exerciseIndex];
    const plan = parseSetPlan(item.volume);
    if (plan.timedSeconds) {
      return {
        ...current,
        phase: "work",
        workSecondsLeft: plan.timedSeconds,
        manualWork: false,
        restSecondsLeft: 0,
        paused: false,
      };
    }
    return {
      ...current,
      phase: "work",
      workSecondsLeft: 0,
      manualWork: true,
      restSecondsLeft: 0,
      paused: false,
    };
  }

  function advanceAfterStrengthTimedWork(current: SessionRuntime): SessionRuntime {
    const plan = parseSetPlan(workout.exercises[current.exerciseIndex].volume);
    if (current.setNumber < plan.sets) {
      playRestEndSound(ensureAudio());
      vibrate(160);
      return {
        ...current,
        phase: "rest",
        restSecondsLeft: SET_REST_SEC,
        setNumber: current.setNumber + 1,
        paused: false,
      };
    }
    if (current.exerciseIndex + 1 < totalExercises) {
      playRestEndSound(ensureAudio());
      vibrate(160);
      return {
        ...current,
        phase: "rest",
        restSecondsLeft: BETWEEN_EXERCISE_REST_SEC,
        exerciseIndex: current.exerciseIndex + 1,
        setNumber: 1,
        paused: false,
      };
    }
    playWorkoutCompleteSound(ensureAudio());
    vibrate([220, 80, 220]);
    return { ...current, phase: "done", paused: false };
  }

  function getAfterCircuitWork(current: SessionRuntime): SessionRuntime {
    if (!circuit) return current;
    const isLastExercise = current.exerciseIndex >= totalExercises - 1;
    const isLastRound = current.circuitRound >= circuit.rounds;

    if (!isLastExercise) {
      playRestEndSound(ensureAudio());
      vibrate(140);
      return {
        ...current,
        phase: "circuit-exercise-rest",
        restSecondsLeft: circuit.exerciseRestSec,
        manualWork: false,
        paused: false,
      };
    }
    if (!isLastRound) {
      return {
        ...current,
        phase: "circuit-round-rest",
        restSecondsLeft: circuit.roundRestSec,
        manualWork: false,
        paused: false,
      };
    }
    playWorkoutCompleteSound(ensureAudio());
    vibrate([220, 80, 220]);
    return { ...current, phase: "done", manualWork: false, paused: false };
  }

  function finishCircuitWork() {
    setRuntime((current) => {
      const next = getAfterCircuitWork(current);
      if (next.phase === "circuit-round-rest") playRoundCompleteSound(ensureAudio());
      return next;
    });
  }

  function skipRest() {
    setRuntime((current) => {
      if (current.phase === "rest") return beginStrengthWork(current);
      if (current.phase === "circuit-exercise-rest") {
        return { ...current, ...createCircuitWorkState(workout, current.circuitRound, current.exerciseIndex + 1), paused: false };
      }
      if (current.phase === "circuit-round-rest") {
        return { ...current, ...createCircuitWorkState(workout, current.circuitRound + 1, 0), paused: false };
      }
      return current;
    });
  }

  function togglePause() {
    setRuntime((current) => ({ ...current, paused: !current.paused }));
  }

  function closeSession() {
    if (runtime.phase === "done") {
      onDiscard();
      return;
    }
    onClose();
  }

  const requestScreenWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      lock.addEventListener("release", () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch {
      // Wake lock is optional.
    }
  }, []);

  useEffect(() => {
    saveWorkoutSession(workout, week, runtime);
  }, [runtime, week, workout]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void requestScreenWakeLock();
    }

    void requestScreenWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      void lock?.release();
    };
  }, [requestScreenWakeLock]);

  useEffect(() => {
    if (runtime.phase !== "done") void requestScreenWakeLock();
  }, [requestScreenWakeLock, runtime.phase]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSession();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSession]);

  useEffect(() => {
    if (runtime.paused || runtime.phase === "warmup" || runtime.phase === "done") return;
    if (runtime.phase === "work" && runtime.manualWork) return;
    if (runtime.phase === "circuit-work" && runtime.manualWork) return;

    const timer = window.setInterval(() => {
      setRuntime((current) => {
        if (current.paused) return current;

        if (current.phase === "rest" || current.phase === "circuit-exercise-rest" || current.phase === "circuit-round-rest") {
          if (current.restSecondsLeft <= 1) {
            if (audioRef.current) playRestEndSound(audioRef.current);
            if (current.phase === "rest") return beginStrengthWork(current);
            if (current.phase === "circuit-exercise-rest") {
              return { ...current, ...createCircuitWorkState(workout, current.circuitRound, current.exerciseIndex + 1), paused: false };
            }
            return { ...current, ...createCircuitWorkState(workout, current.circuitRound + 1, 0), paused: false };
          }
          return { ...current, restSecondsLeft: current.restSecondsLeft - 1 };
        }

        if (current.phase === "work" && !current.manualWork) {
          if (current.workSecondsLeft <= 1) return advanceAfterStrengthTimedWork(current);
          return { ...current, workSecondsLeft: current.workSecondsLeft - 1 };
        }

        if (current.phase === "circuit-work" && !current.manualWork) {
          if (current.workSecondsLeft <= 1) {
            const next = getAfterCircuitWork(current);
            if (next.phase === "circuit-round-rest") playRoundCompleteSound(ensureAudio());
            if (next.phase === "done") playWorkoutCompleteSound(ensureAudio());
            return next;
          }
          return { ...current, workSecondsLeft: current.workSecondsLeft - 1 };
        }

        return current;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [runtime.phase, runtime.paused, runtime.manualWork, workout]);

  const progressLabel =
    runtime.phase === "warmup"
      ? `Разминка ${runtime.warmupIndex + 1}/${warmupSteps.length}`
      : runtime.phase === "done"
        ? "Готово"
        : isCircuit
          ? `Круг ${runtime.circuitRound}/${circuit?.rounds ?? 1} · ${runtime.exerciseIndex + 1}/${totalExercises}`
          : `Упражнение ${runtime.exerciseIndex + 1}/${totalExercises} · подход ${runtime.setNumber}/${setPlan.sets}`;

  const phaseTitle =
    runtime.phase === "warmup"
      ? warmupStep?.title ?? "Разминка"
      : runtime.phase === "rest"
        ? "Отдых между подходами"
        : runtime.phase === "circuit-exercise-rest"
          ? "Отдых между упражнениями"
          : runtime.phase === "circuit-round-rest"
            ? "Перерыв между кругами"
            : runtime.phase === "done"
              ? "Тренировка завершена"
              : currentExercise?.name ?? workout.title;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#080907] text-stone-50">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <button
          className="grid h-10 w-10 place-items-center rounded-full text-stone-400 transition hover:bg-white/[0.06] hover:text-white"
          onClick={closeSession}
          type="button"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white">{workout.title}</p>
          <p className="text-xs text-stone-500">
            {workout.day} · неделя {week}
          </p>
        </div>
        <span className="max-w-[42%] truncate text-right text-xs text-lime-200/90">{progressLabel}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {runtime.phase === "warmup" && warmupStep && (
          <div className="mx-auto grid max-w-lg gap-5">
            <div className="overflow-hidden rounded-2xl bg-lime-300/10 px-5 py-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200">Разминка</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{warmupStep.title}</h2>
              <p className="mt-2 text-sm text-stone-400">{warmupStep.duration}</p>
            </div>
            <p className="text-base leading-7 text-stone-300">{warmupStep.details}</p>
            <div className="grid gap-2">
              {warmupSteps.map((step, index) => (
                <div
                  className={cn(
                    "flex items-center gap-3 px-1 py-1 text-sm",
                    index === runtime.warmupIndex ? "text-lime-200" : index < runtime.warmupIndex ? "text-stone-500" : "text-stone-600",
                  )}
                  key={step.id}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", index <= runtime.warmupIndex ? "bg-lime-300" : "bg-white/15")} />
                  {step.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {(runtime.phase === "work" || runtime.phase === "circuit-work") && currentExercise && currentItem && (
          <div className="mx-auto grid max-w-lg gap-5">
            <ExerciseMedia exercise={currentExercise} />
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{currentExercise.name}</h2>
            <p className="mt-2 text-sm text-stone-400">
                {currentItem.volume} · {currentItem.load}
              </p>
            </div>
            <MuscleFocusCard exercise={currentExercise} compact />
            <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-6 text-stone-300">{currentItem.cue}</p>
            {!runtime.manualWork && runtime.workSecondsLeft > 0 && (
              <p className="text-center text-6xl font-semibold tabular-nums tracking-[-0.05em] text-lime-200">
                {formatClock(runtime.workSecondsLeft)}
              </p>
            )}
            {isCircuit && (
              <p className="text-center text-sm text-stone-500">
                Круг {runtime.circuitRound}/{circuit?.rounds} · упражнение {runtime.exerciseIndex + 1}/{totalExercises}
              </p>
            )}
          </div>
        )}

        {(runtime.phase === "rest" || runtime.phase === "circuit-exercise-rest" || runtime.phase === "circuit-round-rest") && (
          <div className="mx-auto grid max-w-lg gap-6 pt-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{phaseTitle}</p>
            <p
              className={cn(
                "text-7xl font-semibold tabular-nums tracking-[-0.05em]",
                runtime.phase === "circuit-round-rest" ? "text-coral-light" : "text-white",
              )}
            >
              {formatClock(runtime.restSecondsLeft)}
            </p>
            {runtime.phase === "rest" && currentExercise && (
              <p className="text-sm text-stone-400">
                Дальше: {currentExercise.name} · подход {runtime.setNumber}/{setPlan.sets}
              </p>
            )}
            {(runtime.phase === "circuit-exercise-rest" || runtime.phase === "circuit-round-rest") && (
              <p className="text-sm text-stone-400">Приготовься к следующему упражнению</p>
            )}
          </div>
        )}

        {runtime.phase === "done" && (
          <div className="mx-auto grid max-w-lg gap-5 pt-10 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-lime-300 text-stone-950">
              <Check size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">Отличная работа!</h2>
            <p className="text-sm leading-6 text-stone-400">
              {workout.title} на неделе {week} пройдена. Можно отметить выполнение и закрыть режим.
            </p>
            <CompletionEffectPanel workout={workout} />
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-white/[0.06] px-4 py-4 sm:px-6">
        <div className="mx-auto grid max-w-lg gap-2">
          {runtime.phase === "warmup" && (
            <button
              className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950"
              onClick={finishWarmupStep}
              type="button"
            >
              {runtime.warmupIndex + 1 < warmupSteps.length ? "Готово, дальше" : isCircuit ? "Старт круговой" : "К упражнениям"}
            </button>
          )}

          {runtime.phase === "work" && runtime.manualWork && (
            <button className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950" onClick={finishStrengthSet} type="button">
              Подход сделан
            </button>
          )}

          {runtime.phase === "circuit-work" && runtime.manualWork && (
            <button className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950" onClick={finishCircuitWork} type="button">
              Готово
            </button>
          )}

          {(runtime.phase === "rest" ||
            runtime.phase === "circuit-exercise-rest" ||
            runtime.phase === "circuit-round-rest") && (
            <>
              <button
                className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950"
                onClick={skipRest}
                type="button"
              >
                Пропустить отдых
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
                onClick={togglePause}
                type="button"
              >
                {runtime.paused ? <Play size={16} /> : <Pause size={16} />}
                {runtime.paused ? "Продолжить" : "Пауза"}
              </button>
            </>
          )}

          {runtime.phase === "work" && !runtime.manualWork && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
              onClick={togglePause}
              type="button"
            >
              {runtime.paused ? <Play size={16} /> : <Pause size={16} />}
              {runtime.paused ? "Продолжить" : "Пауза"}
            </button>
          )}

          {runtime.phase === "circuit-work" && !runtime.manualWork && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
              onClick={togglePause}
              type="button"
            >
              {runtime.paused ? <Play size={16} /> : <Pause size={16} />}
              {runtime.paused ? "Продолжить" : "Пауза"}
            </button>
          )}

          {runtime.phase === "done" && (
            <>
              <button className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950" onClick={onComplete} type="button">
                Готово!
              </button>
              <button className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-stone-300" onClick={onDiscard} type="button">
                Закрыть без отметки
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function CompletionEffectPanel({ workout }: { workout: Workout }) {
  const previewExercises = workout.exercises
    .map((item) => exerciseById.get(item.exerciseId))
    .filter((exercise): exercise is Exercise => Boolean(exercise?.mediaUrl))
    .slice(0, 4);

  return (
    <div className="rounded-[26px] border border-lime-300/15 bg-white/[0.04] p-4 text-left">
      <p className="text-sm font-semibold text-lime-200">{workout.completionEffect.title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-300">{workout.completionEffect.summary}</p>

      {previewExercises.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {previewExercises.map((exercise) => (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30" key={exercise.id}>
              <img className="aspect-square w-full object-contain" src={exercise.mediaUrl} alt={exercise.name} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {workout.completionEffect.bullets.map((item) => (
          <div className="flex gap-2 text-sm leading-6 text-stone-300" key={item}>
            <Check className="mt-1 shrink-0 text-lime-300" size={15} strokeWidth={2.5} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-2xl bg-black/24 px-3 py-2.5 text-xs leading-5 text-stone-500">{workout.completionEffect.recovery}</p>
    </div>
  );
}

function TrainingPlan({
  activeWorkout,
  activeWorkoutId,
  completed,
  currentWeek,
  startDate,
  newPlaylistTitle,
  newPlaylistUrl,
  playlists,
  weightLogs,
  onAddPlaylist,
  onNewPlaylistTitle,
  onNewPlaylistUrl,
  onOpenExercise,
  onRemovePlaylist,
  onSelectWorkout,
  onStartWorkout,
  onToggleWorkout,
  onWeightLogChange,
}: {
  activeWorkout: Workout;
  activeWorkoutId: WorkoutId;
  completed: Record<string, boolean>;
  currentWeek: number;
  startDate: string;
  newPlaylistTitle: string;
  newPlaylistUrl: string;
  playlists: Playlist[];
  weightLogs: Record<string, string>;
  onAddPlaylist: () => void;
  onNewPlaylistTitle: (value: string) => void;
  onNewPlaylistUrl: (value: string) => void;
  onOpenExercise: (context: ExerciseContext) => void;
  onRemovePlaylist: (id: string) => void;
  onSelectWorkout: (id: WorkoutId) => void;
  onStartWorkout: () => void;
  onToggleWorkout: (week: number, id: WorkoutId) => void;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const block = getProgressionForWeek(currentWeek);
  const activeWorkoutDone = Boolean(completed[getWorkoutKey(currentWeek, activeWorkoutId)]);
  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <PageTitle icon={Dumbbell} title="Тренировки" subtitle="4 дня в неделю" />

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {workouts.map((workout) => (
          <button
            className={cn(
              "min-w-[210px] rounded-[26px] border p-4 text-left transition",
              activeWorkoutId === workout.id
                ? "border-lime-300/60 bg-lime-300 text-stone-950"
                : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]",
            )}
            key={workout.id}
            onClick={() => onSelectWorkout(workout.id)}
            type="button"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">{workout.day}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{workout.title}</h3>
            <p className="mt-2 text-sm opacity-70">{workout.focus}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel title={activeWorkout.title} icon={Timer} right={activeWorkout.duration}>
          <button
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200"
            onClick={onStartWorkout}
            type="button"
          >
            <Play size={18} />
            Начать тренировку
          </button>
          <button
            className={cn(
              "mb-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
              activeWorkoutDone
                ? "border border-lime-300/35 bg-lime-300/12 text-lime-100"
                : "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]",
            )}
            onClick={() => onToggleWorkout(currentWeek, activeWorkoutId)}
            type="button"
          >
            <Check size={18} />
            {activeWorkoutDone ? "Выполнена · снять отметку" : "Отметить выполненной"}
          </button>
          <div className="grid gap-3">
            {activeWorkout.exercises.map((item, index) => {
              const exercise = exerciseById.get(item.exerciseId);
              if (!exercise) return null;
              return (
                <button
                  className="w-full rounded-[24px] border border-white/10 bg-black/20 p-3 text-left transition hover:border-lime-300/35 hover:bg-black/35 focus:outline-none focus:ring-2 focus:ring-lime-300/45 sm:p-4"
                  key={`${item.exerciseId}-${index}`}
                  onClick={() =>
                    onOpenExercise({
                      exerciseId: item.exerciseId,
                      workoutId: activeWorkout.id,
                      week: currentWeek,
                      volume: item.volume,
                      load: item.load,
                      cue: item.cue,
                    })
                  }
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-lime-200">
                      <exercise.Icon size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{exercise.name}</h3>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-stone-300 sm:grid-cols-3">
                        <span>{item.volume}</span>
                        <span>{item.load}</span>
                        <span>{item.cue}</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 shrink-0 text-stone-500" size={18} />
                  </div>
                </button>
              );
            })}
          </div>
          {activeWorkout.note && <p className="mt-4 rounded-2xl bg-coral/15 p-4 text-sm leading-6 text-coral-light">{activeWorkout.note}</p>}
        </Panel>

        <div className="grid gap-5">
          {activeWorkout.circuit && <CircuitTimer workout={activeWorkout} />}
          <Panel title={`Неделя ${currentWeek}`} icon={CalendarDays}>
          <div className="grid gap-2">
            {weeks.map((week) => {
              const doneCount = workouts.filter((workout) => completed[getWorkoutKey(week, workout.id)]).length;
              return (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3" key={week}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Неделя {week}</span>
                    <span className="text-xs text-stone-400">{doneCount}/4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {workouts.map((workout) => {
                      const done = Boolean(completed[getWorkoutKey(week, workout.id)]);
                      const planDate = getWorkoutPlanDate(startDate, week, workout.id);
                      return (
                        <button
                          className={cn(
                            "min-h-12 rounded-xl px-1 text-xs font-bold leading-tight transition",
                            done ? "bg-lime-300 text-stone-950" : "bg-black/30 text-stone-500 hover:text-white",
                          )}
                          key={workout.id}
                          onClick={() => onToggleWorkout(week, workout.id)}
                          type="button"
                        >
                          <span className="block">Д{getWorkoutDayOffset(workout.id) + 1}</span>
                          <span className={cn("block text-[10px] font-semibold", done ? "text-stone-800" : "text-stone-600")}>
                            {formatPlanDate(planDate)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

          <Section subtitle={`${block.focus} · цель ${block.barbell}`} title={`Веса · неделя ${currentWeek}`}>
            <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
              {journalExerciseIds.map((exerciseId, index) => {
                const exercise = exerciseById.get(exerciseId);
                if (!exercise) return null;
                const plannedLoad = getPlannedLoad(exerciseId);
                return (
                  <label className={cn("block px-4 py-3", index > 0 && "border-t border-white/[0.06]")} key={exerciseId}>
                    <div className="grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-center">
                      <div className="min-w-0">
                        <span className="block text-sm font-medium leading-5 text-white">{exercise.name}</span>
                        <span className="mt-1 block break-words text-xs leading-5 text-stone-500">план: {plannedLoad}</span>
                      </div>
                      <input
                        className="w-full rounded-xl bg-black/30 px-3 py-2 text-left text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-stone-600 focus:ring-lime-300/40 sm:text-right"
                        inputMode="decimal"
                        placeholder="факт"
                        value={weightLogs[getWeightLogKey(currentWeek, exerciseId)] ?? ""}
                        onChange={(event) => onWeightLogChange(currentWeek, exerciseId, event.target.value)}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>
      </section>

      <Panel title="Прогрессия нагрузки" icon={Gauge}>
        <div className="grid gap-3 md:grid-cols-4">
          {progression.map((block) => (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4" key={block.weeks}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200">Недели {block.weeks}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{block.focus}</h3>
              <p className="mt-2 text-sm text-stone-300">{block.barbell}</p>
              <p className="mt-2 text-xs leading-5 text-stone-500">{block.intensity}. {block.cue}</p>
            </div>
          ))}
        </div>
      </Panel>

      <MusicPlaylistSection
        newPlaylistTitle={newPlaylistTitle}
        newPlaylistUrl={newPlaylistUrl}
        playlists={playlists}
        onAddPlaylist={onAddPlaylist}
        onNewPlaylistTitle={onNewPlaylistTitle}
        onNewPlaylistUrl={onNewPlaylistUrl}
        onRemovePlaylist={onRemovePlaylist}
      />
    </div>
  );
}

function MusicPlaylistSection({
  newPlaylistTitle,
  newPlaylistUrl,
  playlists,
  onAddPlaylist,
  onNewPlaylistTitle,
  onNewPlaylistUrl,
  onRemovePlaylist,
}: {
  newPlaylistTitle: string;
  newPlaylistUrl: string;
  playlists: Playlist[];
  onAddPlaylist: () => void;
  onNewPlaylistTitle: (value: string) => void;
  onNewPlaylistUrl: (value: string) => void;
  onRemovePlaylist: (id: string) => void;
}) {
  return (
    <Section subtitle="Ссылки открываются в приложении или браузере" title="Музыка для тренировок">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl bg-white/[0.025] md:grid md:grid-cols-3 md:gap-px md:bg-white/[0.06]">
          {playlists.map((playlist, index) => (
            <div
              className={cn(
                "bg-[#080907] p-4",
                index > 0 && "border-t border-white/[0.06] md:border-t-0",
              )}
              key={playlist.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-stone-500">темп {playlist.bpm}</p>
                  <h3 className="mt-1 text-base font-semibold text-white">{playlist.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-stone-400">{playlist.mood}</p>
                </div>
                <button
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-white/[0.06] hover:text-white"
                  onClick={() => onRemovePlaylist(playlist.id)}
                  type="button"
                  aria-label="Удалить плейлист"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <a
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lime-300 transition hover:text-lime-200"
                href={playlist.url}
                target="_blank"
                rel="noreferrer"
              >
                Открыть <ArrowUpRight size={15} />
              </a>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-white">Добавить плейлист</p>
          <p className="mt-1 text-sm text-stone-500">Ссылка на плейлист или альбом в Яндекс Музыке.</p>
          <input
            className="mt-4 w-full rounded-xl bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition focus:ring-lime-300/40"
            placeholder="Название"
            value={newPlaylistTitle}
            onChange={(event) => onNewPlaylistTitle(event.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition focus:ring-lime-300/40"
              placeholder="https://music.yandex.ru/..."
              value={newPlaylistUrl}
              onChange={(event) => onNewPlaylistUrl(event.target.value)}
            />
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral text-white"
              onClick={onAddPlaylist}
              type="button"
              aria-label="Добавить плейлист"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ExerciseLibrary({
  activeExercise,
  activeExerciseId,
  category,
  exercises: filteredExercises,
  query,
  onCategoryChange,
  onQueryChange,
  onSelectExercise,
}: {
  activeExercise: Exercise;
  activeExerciseId: string;
  category: ExerciseCategory | "Все";
  exercises: Exercise[];
  query: string;
  onCategoryChange: (category: ExerciseCategory | "Все") => void;
  onQueryChange: (query: string) => void;
  onSelectExercise: (id: string) => void;
}) {
  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <PageTitle icon={Library} title="Библиотека упражнений" />

      <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Panel title="Фильтр" icon={Search}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-lime-300/60"
              placeholder="упражнение, мышца, инвентарь"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryFilters.map((item) => (
              <button
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  category === item ? "bg-lime-300 text-stone-950" : "bg-white/8 text-stone-300 hover:bg-white/12",
                )}
                key={item}
                onClick={() => onCategoryChange(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 grid max-h-[580px] gap-2 overflow-y-auto pr-1">
            {filteredExercises.map((exercise) => (
              <button
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  activeExerciseId === exercise.id ? "border-coral bg-coral/14" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
                )}
                key={exercise.id}
                onClick={() => onSelectExercise(exercise.id)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-lime-200">
                    <exercise.Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                    <p className="truncate text-xs text-stone-500">{exercise.category}</p>
                  </div>
                  <ChevronRight className="shrink-0 text-stone-500 xl:hidden" size={18} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="hidden xl:block">
          <Panel title={activeExercise.name} icon={Library} right={activeExercise.category}>
          <ExerciseMedia exercise={activeExercise} />

          <div className="mt-5">
            <MuscleFocusCard exercise={activeExercise} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-stone-300">Подготовка</p>
              <p className="mt-2 text-sm leading-6 text-stone-400">{activeExercise.setup}</p>
            </div>
            <div className="rounded-[24px] bg-lime-300/10 p-4">
              <p className="text-sm font-semibold text-lime-200">Подсказка</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">{activeExercise.quietCue}</p>
            </div>
          </div>
        </Panel>
        </div>
      </section>
    </div>
  );
}

function getExerciseMuscleZones(exercise: Exercise): MuscleZone[] {
  const text = `${exercise.category} ${exercise.muscles}`.toLowerCase();
  const zones = new Set<MuscleZone>();

  if (text.includes("плеч") || text.includes("дельт") || text.includes("ротатор")) zones.add("shoulders");
  if (text.includes("груд")) zones.add("chest");
  if (text.includes("ромбовид") || text.includes("трапец") || text.includes("верх спины") || text.includes("осан")) zones.add("upperBack");
  if (text.includes("широчай")) zones.add("lats");
  if (text.includes("бицеп") || text.includes("трицеп") || text.includes("предплеч") || text.includes("рук")) zones.add("arms");
  if (text.includes("кор") || text.includes("живот") || text.includes("таз") || text.includes("поясниц")) zones.add("core");
  if (text.includes("ягод")) zones.add("glutes");
  if (text.includes("задняя поверхность бедра") || text.includes("бедра")) zones.add("hamstrings");
  if (text.includes("сгибатели бедра") || text.includes("ноги")) zones.add("quads");
  if (text.includes("голен") || text.includes("стоп")) zones.add("calves");

  if (zones.size === 0) {
    if (exercise.category === "Верх") zones.add("shoulders").add("arms").add("upperBack");
    if (exercise.category === "Ягодицы") zones.add("glutes").add("hamstrings");
    if (exercise.category === "Кор") zones.add("core");
    if (exercise.category === "Кардио") zones.add("shoulders").add("core").add("quads").add("calves");
  }

  return Array.from(zones);
}

function MuscleFocusCard({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const zones = getExerciseMuscleZones(exercise);
  return (
    <div className={cn("rounded-[24px] border border-lime-300/15 bg-lime-300/[0.06] p-4", compact && "p-3")}>
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <MuscleMap zones={zones} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-lime-200">Какие мышцы должны работать</p>
          <p className={cn("mt-2 leading-6 text-stone-200", compact ? "text-sm" : "text-base")}>{exercise.muscles}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs font-semibold text-lime-100" key={zone}>
                {muscleZoneLabels[zone]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Основное усилие должно ощущаться в подсвеченных зонах. Если вместо них забирают шею, поясница или суставы, уменьши нагрузку и проверь технику.
          </p>
        </div>
      </div>
    </div>
  );
}

function MuscleMap({ zones }: { zones: MuscleZone[] }) {
  const active = new Set(zones);
  const fill = (zone: MuscleZone) => (active.has(zone) ? "#bef264" : "#30342b");
  const softFill = (zone: MuscleZone) => (active.has(zone) ? "#fb7185" : "#242820");

  return (
    <div className="mx-auto grid w-full max-w-[160px] gap-2">
      <svg className="h-auto w-full" viewBox="0 0 160 210" role="img" aria-label="Схема рабочих мышц">
        <rect width="160" height="210" rx="22" fill="#11140f" />
        <text x="40" y="22" fill="#a8a29e" fontSize="10" textAnchor="middle">
          спереди
        </text>
        <text x="120" y="22" fill="#a8a29e" fontSize="10" textAnchor="middle">
          сзади
        </text>

        <circle cx="40" cy="39" r="10" fill="#4b5244" />
        <path d="M24 58 Q40 48 56 58 L52 112 Q40 123 28 112 Z" fill={fill("core")} stroke="#1f241d" strokeWidth="2" />
        <path d="M25 58 Q18 66 15 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M55 58 Q62 66 65 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M15 82 L12 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M65 82 L68 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M29 67 Q40 61 51 67 L49 86 Q40 93 31 86 Z" fill={fill("chest")} opacity="0.95" />
        <path d="M31 114 L25 166" stroke={fill("quads")} strokeWidth="12" strokeLinecap="round" />
        <path d="M49 114 L55 166" stroke={fill("quads")} strokeWidth="12" strokeLinecap="round" />
        <path d="M25 166 L23 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
        <path d="M55 166 L57 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />

        <circle cx="120" cy="39" r="10" fill="#4b5244" />
        <path d="M104 58 Q120 48 136 58 L132 112 Q120 123 108 112 Z" fill={fill("upperBack")} stroke="#1f241d" strokeWidth="2" />
        <path d="M109 72 Q120 62 131 72 L128 98 Q120 108 112 98 Z" fill={fill("lats")} opacity="0.96" />
        <path d="M105 58 Q98 66 95 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M135 58 Q142 66 145 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M95 82 L92 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M145 82 L148 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M109 111 Q120 121 131 111 L129 130 Q120 137 111 130 Z" fill={softFill("glutes")} />
        <path d="M111 132 L105 166" stroke={fill("hamstrings")} strokeWidth="12" strokeLinecap="round" />
        <path d="M129 132 L135 166" stroke={fill("hamstrings")} strokeWidth="12" strokeLinecap="round" />
        <path d="M105 166 L103 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
        <path d="M135 166 L137 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-stone-500">
        <span className="h-2 w-2 rounded-full bg-lime-300" />
        рабочая зона
      </div>
    </div>
  );
}

function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [mediaState, setMediaState] = useState<"loading" | "loaded" | "failed">(exercise.mediaUrl ? "loading" : "failed");

  useEffect(() => {
    if (!exercise.mediaUrl) {
      setMediaState("failed");
      return;
    }

    const image = imageRef.current;
    if (image?.complete) {
      setMediaState(image.naturalWidth > 0 ? "loaded" : "failed");
      return;
    }

    setMediaState("loading");
  }, [exercise.id, exercise.mediaUrl]);

  if (!exercise.mediaUrl || mediaState === "failed") {
    return (
      <div className="grid aspect-square w-full max-h-[min(72vh,420px)] place-items-center rounded-[30px] border border-white/10 bg-[#141711] p-6 text-center">
        <Dumbbell className="text-stone-600" size={36} />
        <p className="mt-3 text-sm text-stone-500">Анимация недоступна</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full max-h-[min(72vh,420px)] overflow-hidden rounded-[30px] border border-white/10 bg-[#141711]">
      <img
        className={cn("h-full w-full object-contain object-center", mediaState === "loading" && "opacity-0")}
        ref={imageRef}
        src={exercise.mediaUrl}
        alt={exercise.name}
        onLoad={() => setMediaState("loaded")}
        onError={() => setMediaState("failed")}
        loading="lazy"
      />
      {mediaState === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-lime-300" />
        </div>
      )}
    </div>
  );
}

function ExerciseDetailSheet({ context, onClose }: { context: ExerciseContext; onClose: () => void }) {
  const exercise = exerciseById.get(context.exerciseId);
  const workout = context.workoutId ? workoutById.get(context.workoutId) : undefined;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!exercise) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label="Закрыть упражнение" />
      <section className="relative flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#10120d] shadow-2xl sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[34px]">
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-lime-200">
                {workout ? `${workout.title}${context.week ? ` · неделя ${context.week}` : ""}` : "Библиотека упражнений"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{exercise.name}</h2>
              <p className="mt-2 text-sm text-stone-500">{exercise.equipment.join(" · ")}</p>
            </div>
            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/8 text-stone-300 hover:text-white"
              onClick={onClose}
              type="button"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>

          <ExerciseMedia exercise={exercise} />

          <div className="mt-5 grid gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DetailMetric label="Объём" value={context.volume ?? "по плану"} />
              <DetailMetric label="Нагрузка" value={context.load ?? "подбери по ощущениям"} />
              <DetailMetric label="Фокус" value={exercise.category} />
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-lime-200">На что смотреть</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">{context.cue ?? exercise.quietCue}</p>
            </div>
            {exercise.technique.length > 0 && (
              <div className="rounded-[24px] bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-stone-300">Техника</p>
                <ol className="mt-3 grid gap-2.5">
                  {exercise.technique.map((step, index) => (
                    <li className="flex gap-3 text-sm leading-6 text-stone-400" key={step}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-300/15 text-xs font-bold text-lime-200">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="rounded-[24px] bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-stone-300">Подготовка</p>
              <p className="mt-2 text-sm leading-6 text-stone-400">{exercise.setup}</p>
            </div>
            <MuscleFocusCard exercise={exercise} />
            {exercise.sourceUrl && (
              <a
                className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-lime-300 transition hover:bg-white/10 hover:text-lime-200"
                href={exercise.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Видео с техникой <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] bg-black/24 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-2 break-words text-base font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}

function getPlannedLoad(exerciseId: string) {
  for (const workout of workouts) {
    const item = workout.exercises.find((entry) => entry.exerciseId === exerciseId);
    if (item) return item.load;
  }
  return "кг";
}

function getPreviousWeightLog(weightLogs: Record<string, string>, week: number, exerciseId: string) {
  for (let index = week - 1; index >= 1; index -= 1) {
    const value = weightLogs[getWeightLogKey(index, exerciseId)]?.trim();
    if (value) return { week: index, value };
  }
  return null;
}

function pickComparePhotos(photos: ProgressPhotoView[]) {
  const before = photos.find((photo) => photo.label === "До") ?? photos.find((photo) => photo.week === 1);
  const after = photos.find((photo) => photo.label === "После") ?? photos.find((photo) => photo.week === 8);
  if (before && after && before.id !== after.id) return { before, after };
  const sorted = [...photos].sort((left, right) => left.week - right.week || left.createdAt.localeCompare(right.createdAt));
  if (sorted.length >= 2) return { before: sorted[0], after: sorted[sorted.length - 1] };
  return null;
}

function PhotoCompareSlider({
  afterLabel,
  afterSrc,
  beforeLabel,
  beforeSrc,
}: {
  afterLabel: string;
  afterSrc: string;
  beforeLabel: string;
  beforeSrc: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  function updatePosition(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const next = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setPosition(next);
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      updatePosition(event.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between text-sm text-stone-400">
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
      <div
        className="relative aspect-[4/5] touch-none select-none overflow-hidden rounded-2xl bg-black/30"
        ref={trackRef}
        onPointerDown={(event) => {
          dragging.current = true;
          updatePosition(event.clientX);
        }}
      >
        <img className="absolute inset-0 h-full w-full object-cover" src={afterSrc} alt={afterLabel} draggable={false} />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img
            className="h-full max-w-none object-cover"
            src={beforeSrc}
            alt={beforeLabel}
            draggable={false}
            style={{ width: `${position > 0 ? (100 / position) * 100 : 100}%` }}
          />
        </div>
        <div className="absolute inset-y-0 z-10 w-0.5 bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.45)]" style={{ left: `${position}%` }}>
          <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-stone-950 shadow-lg">
            ↔
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-500">Проведи по фото, чтобы сравнить «до» и «после».</p>
    </div>
  );
}

function WeightJournal({
  currentWeek,
  weightLogs,
  onWeightLogChange,
}: {
  currentWeek: number;
  weightLogs: Record<string, string>;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const [activeWeek, setActiveWeek] = useState(currentWeek);
  const block = getProgressionForWeek(activeWeek);

  useEffect(() => {
    setActiveWeek(currentWeek);
  }, [currentWeek]);

  return (
    <Section subtitle={`${block.focus} · штанга ${block.barbell} · ${block.intensity}`} title="Дневник весов">
      <div className="max-w-full min-w-0 overflow-x-auto pb-1">
        <div className="no-scrollbar flex w-max min-w-full gap-2">
        {weeks.map((week) => (
          <button
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition",
              activeWeek === week ? "bg-lime-300 text-stone-950" : "bg-white/[0.06] text-stone-400",
            )}
            key={week}
            onClick={() => setActiveWeek(week)}
            type="button"
          >
            Неделя {week}
          </button>
        ))}
        </div>
      </div>
      <p className="text-sm text-stone-500">{block.cue}</p>
      <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
        {journalExerciseIds.map((exerciseId, index) => {
          const exercise = exerciseById.get(exerciseId);
          if (!exercise) return null;
          const previous = getPreviousWeightLog(weightLogs, activeWeek, exerciseId);
          return (
            <label
              className={cn("block px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
              key={exerciseId}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem] sm:items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{exercise.name}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-stone-500">план: {getPlannedLoad(exerciseId)}</p>
                  {previous && (
                    <p className="mt-1 text-xs text-lime-200/80">
                      неделя {previous.week}: {previous.value}
                    </p>
                  )}
                </div>
                <input
                  className="w-full rounded-xl bg-black/30 px-3 py-2 text-left text-sm text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40 sm:text-right"
                  inputMode="decimal"
                  placeholder="кг"
                  value={weightLogs[getWeightLogKey(activeWeek, exerciseId)] ?? ""}
                  onChange={(event) => onWeightLogChange(activeWeek, exerciseId, event.target.value)}
                />
              </div>
            </label>
          );
        })}
      </div>
    </Section>
  );
}

function ProgressPanel({
  currentWeek,
  measurements,
  photos,
  weightLogs,
  onMeasurementChange,
  onOpenReport,
  onPhotoUpload,
  onRemovePhoto,
  onWeightLogChange,
}: {
  currentWeek: number;
  measurements: Measurement[];
  photos: ProgressPhotoView[];
  weightLogs: Record<string, string>;
  onMeasurementChange: (week: number, field: keyof Omit<Measurement, "week">, value: string) => void;
  onOpenReport: () => void;
  onPhotoUpload: (event: ChangeEvent<HTMLInputElement>, label: string, week: number) => void;
  onRemovePhoto: (id: string) => void;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const compare = pickComparePhotos(photos);

  return (
    <div className="grid min-w-0 max-w-full gap-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle icon={Ruler} title="Фото и замеры" subtitle="Данные хранятся локально в IndexedDB." />
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-lime-300 px-5 py-3.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200"
          onClick={onOpenReport}
          type="button"
        >
          <FileText size={18} />
          PDF-отчёт
        </button>
      </div>

      {compare && (
        <Section title="До / после">
          <PhotoCompareSlider
            afterLabel={`${compare.after.label} · неделя ${compare.after.week}`}
            afterSrc={compare.after.src}
            beforeLabel={`${compare.before.label} · неделя ${compare.before.week}`}
            beforeSrc={compare.before.src}
          />
        </Section>
      )}

      <WeightJournal currentWeek={currentWeek} weightLogs={weightLogs} onWeightLogChange={onWeightLogChange} />

      <section className="grid min-w-0 max-w-full gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <Section title="Графики замеров">
          <MiniChart measurements={measurements} fields={["weight", "waist", "belly", "hips"]} />
        </Section>

        <Section title="Фото-прогресс">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <UploadTile label="До" week={1} onUpload={onPhotoUpload} flat />
            <UploadTile label="После" week={8} onUpload={onPhotoUpload} flat />
            <UploadTile label="Еженедельно" week={photos[0]?.week ? Math.min(8, photos[0].week + 1) : 1} onUpload={onPhotoUpload} flat />
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Можно добавить несколько фото в одну неделю или выбрать сразу несколько файлов. Сравнение «до/после» берёт самые подходящие снимки из галереи.
          </p>
          {photos.length > 0 ? (
            <div className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-2">
              {photos.map((photo) => (
                <div className="group relative bg-[#080907]" key={photo.id}>
                  <img className="aspect-[4/5] w-full object-cover" src={photo.src} alt={photo.label} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
                    <p className="text-sm font-semibold text-white">{photo.label}</p>
                    <p className="text-xs text-stone-300">Неделя {photo.week}</p>
                  </div>
                  <button
                    className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => void onRemovePhoto(photo.id)}
                    type="button"
                    aria-label="Удалить фото"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Пока нет фото.</p>
          )}
        </Section>
      </section>

      <MeasurementsTable measurements={measurements} onMeasurementChange={onMeasurementChange} />
    </div>
  );
}

const measurementFieldLabels: Record<"weight" | "waist" | "belly" | "hips", string> = {
  weight: "Вес, кг",
  waist: "Талия, см",
  belly: "Живот, см",
  hips: "Бёдра, см",
};

function MeasurementsTable({
  measurements,
  onMeasurementChange,
}: {
  measurements: Measurement[];
  onMeasurementChange: (week: number, field: keyof Omit<Measurement, "week">, value: string) => void;
}) {
  const inputClassName =
    "w-full min-w-0 rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40";

  return (
    <Section title="Таблица замеров">
      <div className="grid gap-3 md:hidden">
        {measurements.map((item) => (
          <div className="min-w-0 rounded-2xl bg-white/[0.04] p-4" key={item.week}>
            <p className="text-sm font-semibold text-lime-200">Неделя {item.week}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["weight", "waist", "belly", "hips"] as const).map((field) => (
                <label className="min-w-0 text-xs text-stone-500" key={field}>
                  {measurementFieldLabels[field]}
                  <input
                    className={cn(inputClassName, "mt-1.5")}
                    inputMode="decimal"
                    value={item[field]}
                    onChange={(event) => onMeasurementChange(item.week, field, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block min-w-0 text-xs text-stone-500">
              Комментарий
              <input
                className={cn(inputClassName, "mt-1.5")}
                value={item.note}
                onChange={(event) => onMeasurementChange(item.week, "note", event.target.value)}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
        <table className="min-w-[640px] w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-3 py-2">Неделя</th>
              <th className="px-3 py-2">Вес</th>
              <th className="px-3 py-2">Талия</th>
              <th className="px-3 py-2">Живот</th>
              <th className="px-3 py-2">Бёдра</th>
              <th className="px-3 py-2">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((item) => (
              <tr className="rounded-2xl bg-white/[0.04]" key={item.week}>
                <td className="rounded-l-2xl px-3 py-2 font-semibold text-white">{item.week}</td>
                {(["weight", "waist", "belly", "hips"] as const).map((field) => (
                  <td className="px-2 py-2" key={field}>
                    <input
                      className="w-24 max-w-full rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40"
                      inputMode="decimal"
                      value={item[field]}
                      onChange={(event) => onMeasurementChange(item.week, field, event.target.value)}
                    />
                  </td>
                ))}
                <td className="rounded-r-2xl px-2 py-2">
                  <input
                    className="w-full min-w-[12rem] rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40"
                    value={item.note}
                    onChange={(event) => onMeasurementChange(item.week, "note", event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function isMealOptionSelected(
  mealId: string,
  optionId: string,
  selectedMeals: Record<string, string>,
  defaultOptionId?: string,
) {
  return selectedMeals[mealId] === optionId || (!selectedMeals[mealId] && defaultOptionId === optionId);
}

function isOffMenuMealOption(option: MealOption) {
  return option.kcal === 0 && option.id.startsWith("no-") && option.id !== "no-snack";
}

function MealOptionRow({
  option,
  selected,
  onSelect,
  divided,
}: {
  option: MealOption;
  selected: boolean;
  onSelect: () => void;
  divided: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full px-4 py-3.5 text-left transition",
        divided && "border-t border-white/[0.06]",
        selected ? "bg-lime-300/10" : "hover:bg-white/[0.03]",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition",
            selected ? "bg-lime-300 text-stone-950" : "bg-white/[0.08] text-transparent",
          )}
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={cn("font-semibold", selected ? "text-lime-100" : "text-white")}>{option.title}</p>
            <p className="mt-1 text-sm leading-5 text-stone-400">{option.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-300">
                Б {option.protein} · Ж {option.fat} · У {option.carbs}
              </span>
              {option.tags.length > 0 && (
                <span className="text-xs text-stone-500">{option.tags.join(" · ")}</span>
              )}
            </div>
          </div>
          <span className={cn("shrink-0 pt-0.5 text-sm font-semibold tabular-nums", selected ? "text-lime-200" : "text-stone-500")}>
            {option.kcal} ккал
          </span>
        </div>
      </div>
    </button>
  );
}

const mealIcons: Record<string, LucideIcon> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Cookie,
};

function MacroProgressBar({
  label,
  value,
  min,
  max,
  tone = "lime",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  tone?: "lime" | "coral" | "sky";
}) {
  const percent = clamp((value / max) * 100, 0, 100);
  const inRange = value >= min && value <= max;
  const barColor =
    tone === "coral" ? "bg-coral" : tone === "sky" ? "bg-sky-400" : inRange ? "bg-lime-300" : value < min ? "bg-amber-400" : "bg-coral";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold tabular-nums text-white">
          {value} <span className="font-normal text-stone-500">/ {min}–{max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function NutritionDaySummary({
  dayHint,
  extraKcal,
  shopping,
  totals,
  useMenuToday,
}: {
  dayHint: string;
  extraKcal: number;
  shopping: Record<string, boolean>;
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  useMenuToday: boolean;
}) {
  const shoppingDone = shoppingItems.filter((item) => shopping[item]).length;
  const kcalPercent = clamp(Math.round((totals.kcal / 1775) * 100), 0, 100);
  const kcalInRange = totals.kcal >= 1700 && totals.kcal <= 1850;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#151811,#0f110d)] p-5 shadow-xl">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="relative grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200/80">Итог дня</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-white">{totals.kcal}</p>
          <p className="mt-1 text-sm text-stone-400">
            ккал · цель {profile.calories}
            {!useMenuToday && totals.kcal > 0 && <span className="text-coral-light"> · своё питание</span>}
            {useMenuToday && extraKcal > 0 && <span className="text-coral-light"> · +{extraKcal} вне меню</span>}
          </p>
          <div className="mx-auto mt-3 h-1.5 max-w-[180px] overflow-hidden rounded-full bg-white/[0.08] sm:mx-0">
            <div
              className={cn("h-full rounded-full", kcalInRange ? "bg-lime-300" : totals.kcal < 1700 ? "bg-amber-400" : "bg-coral")}
              style={{ width: `${kcalPercent}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3">
          <MacroProgressBar label="Белки, г" max={120} min={105} value={totals.protein} />
          <MacroProgressBar label="Жиры, г" max={60} min={50} tone="coral" value={totals.fat} />
          <MacroProgressBar label="Углеводы, г" max={190} min={160} tone="sky" value={totals.carbs} />
          <p className="text-sm leading-6 text-stone-400">{dayHint}</p>
          <p className="text-xs text-stone-500">
            Покупки: {shoppingDone}/{shoppingItems.length} · белок {profile.macros.split("|")[0]?.trim()}
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectedMealsOverview({
  extraFood,
  selectedMeals,
  useMenuToday,
}: {
  extraFood: ExtraFoodItem[];
  selectedMeals: Record<string, string>;
  useMenuToday: boolean;
}) {
  if (!useMenuToday && extraFood.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-stone-500">
        Добавь продукты в блоке «Вне меню» — они появятся здесь и попадут в итог.
      </p>
    );
  }

  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {useMenuToday &&
        meals.map((meal) => {
          const option = meal.options.find((item) => item.id === selectedMeals[meal.id]) ?? meal.options[0];
          const Icon = mealIcons[meal.id] ?? Salad;
          if (!option) return null;
          const offMenu = isOffMenuMealOption(option);
          return (
            <div
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col rounded-2xl border px-3 py-2.5",
                offMenu ? "border-coral/25 bg-coral/[0.06]" : "border-white/10 bg-white/[0.04]",
              )}
              key={meal.id}
            >
              <div className={cn("flex items-center gap-2", offMenu ? "text-coral-light" : "text-lime-200/90")}>
                <Icon size={14} />
                <span className="text-xs font-bold uppercase tracking-[0.12em]">{meal.title}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">
                {offMenu ? "Своё — см. ниже" : option.title}
              </p>
              <p className="mt-1 text-xs tabular-nums text-stone-500">
                {offMenu ? "добавь в «Вне меню»" : `${option.kcal} ккал · Б ${option.protein}`}
              </p>
            </div>
          );
        })}
      {extraFood.map((item) => (
        <div
          className={cn(
            "flex min-w-[148px] shrink-0 flex-col rounded-2xl border px-3 py-2.5",
            useMenuToday ? "border-coral/25 bg-coral/[0.06]" : "border-white/10 bg-white/[0.04]",
          )}
          key={item.id}
        >
          <div className={cn("flex items-center gap-2", useMenuToday ? "text-coral-light" : "text-lime-200/90")}>
            <UtensilsCrossed size={14} />
            <span className="text-xs font-bold uppercase tracking-[0.12em]">{useMenuToday ? "Вне меню" : "Съела"}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.name}</p>
          <p className="mt-1 text-xs tabular-nums text-stone-500">
            {item.kcal} ккал
            {item.per100g ? ` · ${item.grams} г` : ""}
            {item.protein > 0 ? ` · Б ${item.protein}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function NutritionModeSwitch({
  useMenuToday,
  onChange,
}: {
  useMenuToday: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <button
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            useMenuToday ? "bg-lime-300 text-stone-950" : "text-stone-400 hover:text-white",
          )}
          onClick={() => onChange(true)}
          type="button"
        >
          Ела по меню
        </button>
        <button
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            !useMenuToday ? "bg-coral text-white" : "text-stone-400 hover:text-white",
          )}
          onClick={() => onChange(false)}
          type="button"
        >
          Своё питание
        </button>
      </div>
      {!useMenuToday && (
        <p className="text-sm text-stone-500">
          Меню не считается — добавляй всё съеденное через блок «Вне меню» ниже.
        </p>
      )}
      {useMenuToday && (
        <p className="text-sm text-stone-500">
          Выбери блюда из меню. Для приёма не из плана — отметь «Не из меню» и добавь продукты в блок «Вне меню».
        </p>
      )}
    </div>
  );
}

function MacroStat({ label, target, value }: { label: string; target: string; value: string }) {
  return (
    <div className="px-2 py-1">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-stone-600">цель {target} г</p>
    </div>
  );
}

function NutritionPanel({
  extraFood,
  selectedMeals,
  shopping,
  useMenuToday,
  onAddExtraFood,
  onRemoveExtraFood,
  onSelectMeal,
  onSetUseMenuToday,
  onToggleShopping,
  onUpdateExtraFoodGrams,
}: {
  extraFood: ExtraFoodItem[];
  selectedMeals: Record<string, string>;
  shopping: Record<string, boolean>;
  useMenuToday: boolean;
  onAddExtraFood: (item: Omit<ExtraFoodItem, "id">) => void;
  onRemoveExtraFood: (id: string) => void;
  onSelectMeal: (mealId: string, optionId: string) => void;
  onSetUseMenuToday: (value: boolean) => void;
  onToggleShopping: (item: string) => void;
  onUpdateExtraFoodGrams: (id: string, grams: number) => void;
}) {
  const selectedOptions = meals
    .map((meal) => meal.options.find((option) => option.id === selectedMeals[meal.id]) ?? meal.options[0])
    .filter(Boolean) as MealOption[];
  const menuTotals = useMenuToday
    ? selectedOptions.reduce(
        (sum, option) => ({
          kcal: sum.kcal + option.kcal,
          protein: sum.protein + option.protein,
          fat: sum.fat + option.fat,
          carbs: sum.carbs + option.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      )
    : { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const extraTotals = extraFood.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.protein,
      fat: sum.fat + item.fat,
      carbs: sum.carbs + item.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  const totals = {
    kcal: menuTotals.kcal + extraTotals.kcal,
    protein: menuTotals.protein + extraTotals.protein,
    fat: menuTotals.fat + extraTotals.fat,
    carbs: menuTotals.carbs + extraTotals.carbs,
  };
  const dayHint = !useMenuToday
    ? totals.kcal === 0
      ? "Добавь продукты, которые съела сегодня."
      : totals.kcal < 1700
        ? "Мало калорий — добавь ещё продукты."
        : totals.kcal > 1850
          ? "Выше цели по калориям."
          : totals.protein < 105
            ? "Добавь белка: творог, яйца или мясо."
            : "В пределах цели."
    : totals.kcal < 1700
      ? extraTotals.kcal > 0
        ? "Мало калорий — проверь порции в меню или добавь ещё."
        : "Мало калорий — увеличь порцию или добавь перекус."
      : totals.kcal > 1850
        ? extraTotals.kcal > 0
          ? "Выше цели — возможно, из‑за еды вне меню."
          : "Выше цели — можно облегчить ужин."
        : totals.protein < 105
          ? "Добавь белка: творог, яйца или мясо."
          : "В пределах цели.";

  return (
    <div className="grid min-w-0 max-w-full gap-8">
      <PageTitle icon={Salad} title="Питание" subtitle={`Цель: ${profile.calories}, белок 105–120 г`} />

      <NutritionModeSwitch useMenuToday={useMenuToday} onChange={onSetUseMenuToday} />

      <NutritionDaySummary
        dayHint={dayHint}
        extraKcal={extraTotals.kcal}
        shopping={shopping}
        totals={totals}
        useMenuToday={useMenuToday}
      />

      <FoodLookup
        extraFood={extraFood}
        onAdd={onAddExtraFood}
        onRemove={onRemoveExtraFood}
        onUpdateGrams={onUpdateExtraFoodGrams}
      />

      <Section
        subtitle={useMenuToday ? "Меню на сегодня — меняется при выборе блюда" : "Только продукты, которые ты добавила"}
        title="Сводка"
      >
        <SelectedMealsOverview extraFood={extraFood} selectedMeals={selectedMeals} useMenuToday={useMenuToday} />
      </Section>

      <section className="grid min-w-0 max-w-full gap-8 xl:grid-cols-[1fr_340px] xl:gap-10">
        <Section title="Конструктор дня">
          {!useMenuToday && (
            <p className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone-500">
              Справочно — в итог дня не входит. Можно посмотреть варианты на другие дни.
            </p>
          )}
          <div className={cn(!useMenuToday && "opacity-50")}>
          {meals.map((meal, mealIndex) => {
            const MealIcon = mealIcons[meal.id] ?? Salad;
            return (
            <div className={cn(mealIndex > 0 && "mt-8 border-t border-white/[0.06] pt-8")} key={meal.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-300/12 text-lime-200">
                    <MealIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-white">{meal.title}</h3>
                    <p className="mt-0.5 text-sm text-lime-200/80">{meal.target}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-stone-500">
                  {meal.options.length} варианта
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/[0.04]">
                {meal.options.map((option, optionIndex) => (
                  <MealOptionRow
                    divided={optionIndex > 0}
                    key={option.id}
                    option={option}
                    selected={isMealOptionSelected(meal.id, option.id, selectedMeals, meal.options[0]?.id)}
                    onSelect={() => onSelectMeal(meal.id, option.id)}
                  />
                ))}
              </div>
            </div>
          );
          })}
          </div>
        </Section>

        <div className="grid gap-8">
          <div className="hidden xl:block">
            <Section title="Итог дня">
              <Card className="grid gap-4">
                <div className="rounded-[22px] bg-lime-300 p-5 text-stone-950">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] opacity-70">за день</p>
                  <p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{totals.kcal}</p>
                  <p className="mt-1 text-sm font-semibold">ккал из цели {profile.calories}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                  <MacroStat label="Белки" value={`${totals.protein} г`} target="105-120" />
                  <MacroStat label="Жиры" value={`${totals.fat} г`} target="50-60" />
                  <MacroStat label="Углеводы" value={`${totals.carbs} г`} target="160-190" />
                </div>
                <p className="text-sm leading-6 text-stone-400">{dayHint}</p>
              </Card>
            </Section>
          </div>

          <Section title="Покупки">
            <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
              {shoppingItems.map((item, index) => {
                const checked = Boolean(shopping[item]);
                return (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]",
                      index > 0 && "border-t border-white/[0.06]",
                    )}
                    key={item}
                  >
                    <input className="sr-only" checked={checked} type="checkbox" onChange={() => onToggleShopping(item)} />
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full transition",
                        checked ? "bg-lime-300 text-stone-950" : "bg-white/[0.08] text-transparent",
                      )}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className={cn("text-sm", checked ? "text-stone-500 line-through" : "text-stone-200")}>{item}</span>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>
      </section>
    </div>
  );
}

function FoodLookup({
  extraFood,
  onAdd,
  onRemove,
  onUpdateGrams,
}: {
  extraFood: ExtraFoodItem[];
  onAdd: (item: Omit<ExtraFoodItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateGrams: (id: string, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portionGrams, setPortionGrams] = useState<Record<string, string>>({});
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/food-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: trimmed,
            page_size: 6,
            langs: ["ru", "en"],
            fields: ["product_name", "brands", "nutriments", "image_front_small_url"],
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("bad response");
        const data = (await response.json()) as { hits?: FoodLookupHit[] };
        setResults(
          (data.hits ?? [])
            .map(normalizeFoodHit)
            .filter((product) => product.product_name),
        );
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setError("Поиск сейчас недоступен. Попробуй ещё раз через минуту.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function getPortionGrams(key: string) {
    const parsed = Number.parseInt(portionGrams[key] ?? "100", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
  }

  function addFromSearch(product: FoodLookupResult, index: number) {
    const grams = getPortionGrams(`${product.product_name}-${index}`);
    const per100g = {
      kcal: roundNutrient(product.nutriments?.["energy-kcal_100g"]),
      protein: roundNutrient(product.nutriments?.proteins_100g),
      fat: roundNutrient(product.nutriments?.fat_100g),
      carbs: roundNutrient(product.nutriments?.carbohydrates_100g),
    };
    const scaled = nutrientsForGrams(per100g, grams);
    onAdd({
      name: product.product_name ?? "Продукт",
      grams,
      ...scaled,
      per100g,
    });
  }

  function addManualEntry() {
    const name = manualName.trim();
    const kcal = Number.parseInt(manualKcal, 10);
    if (!name || !Number.isFinite(kcal) || kcal <= 0) return;
    onAdd({ name, grams: 0, kcal, protein: 0, fat: 0, carbs: 0 });
    setManualName("");
    setManualKcal("");
  }

  return (
    <Panel icon={Search} right="на 100 г" title="Вне меню">
      <p className="mb-4 text-sm text-stone-500">
        Съела что-то не из выбранного блюда? Найди продукт и добавь в день — калории прибавятся к итогу.
      </p>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-lime-300/60"
          placeholder="творог, овсянка, индейка..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {loading && <p className="mt-3 text-sm text-stone-500">Ищу...</p>}
      {error && <p className="mt-3 text-sm text-coral-light">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">Ничего не нашлось — попробуй более простое название или добавь вручную ниже.</p>
      )}
      {results.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white/[0.025]">
          {results.map((product, index) => {
            const key = `${product.product_name}-${index}`;
            const kcal = roundNutrient(product.nutriments?.["energy-kcal_100g"]);
            const protein = roundNutrient(product.nutriments?.proteins_100g);
            const fat = roundNutrient(product.nutriments?.fat_100g);
            const carbs = roundNutrient(product.nutriments?.carbohydrates_100g);
            const grams = getPortionGrams(key);
            const preview = nutrientsForGrams({ kcal, protein, fat, carbs }, grams);
            return (
              <div
                className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
                key={key}
              >
                {product.image_front_small_url ? (
                  <img
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    src={product.image_front_small_url}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-stone-500">
                    100г
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{product.product_name}</p>
                  <p className="truncate text-xs text-stone-500">{product.brands || "без бренда"}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {preview.kcal} ккал за {grams} г · Б {preview.protein} · Ж {preview.fat} · У {preview.carbs}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    className="w-16 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm text-white outline-none focus:border-lime-300/60"
                    inputMode="numeric"
                    min={1}
                    type="number"
                    value={portionGrams[key] ?? "100"}
                    onChange={(event) => setPortionGrams((current) => ({ ...current, [key]: event.target.value }))}
                    aria-label="Граммы"
                  />
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-stone-950 transition hover:bg-lime-200"
                    onClick={() => addFromSearch(product, index)}
                    type="button"
                    aria-label="Добавить в день"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-white/[0.025] p-4">
        <p className="text-sm font-semibold text-white">Добавить вручную</p>
        <p className="mt-1 text-xs text-stone-500">Если продукта нет в базе — укажи название и калории порции.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
            placeholder="Название"
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="w-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              inputMode="numeric"
              placeholder="ккал"
              value={manualKcal}
              onChange={(event) => setManualKcal(event.target.value)}
            />
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral text-white transition hover:bg-coral/90"
              onClick={addManualEntry}
              type="button"
              aria-label="Добавить вручную"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {extraFood.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-white">Добавлено сегодня</p>
          <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
            {extraFood.map((item, index) => (
              <div
                className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
                key={item.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {item.kcal} ккал
                    {item.protein > 0 ? ` · Б ${item.protein}` : ""}
                    {item.fat > 0 ? ` · Ж ${item.fat}` : ""}
                    {item.carbs > 0 ? ` · У ${item.carbs}` : ""}
                  </p>
                </div>
                {item.per100g ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      className="w-16 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm text-white outline-none focus:border-lime-300/60"
                      inputMode="numeric"
                      min={1}
                      type="number"
                      value={item.grams}
                      onChange={(event) => onUpdateGrams(item.id, Number.parseInt(event.target.value, 10))}
                      aria-label="Граммы"
                    />
                    <span className="text-xs text-stone-500">г</span>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500">порция</span>
                )}
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-stone-400 transition hover:bg-coral/20 hover:text-coral-light"
                  onClick={() => onRemove(item.id)}
                  type="button"
                  aria-label="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function nutrientsForGrams(
  per100g: { kcal: number | null; protein: number | null; fat: number | null; carbs: number | null },
  grams: number,
) {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal !== null ? Math.round(per100g.kcal * factor) : 0,
    protein: per100g.protein !== null ? Math.round(per100g.protein * factor) : 0,
    fat: per100g.fat !== null ? Math.round(per100g.fat * factor) : 0,
    carbs: per100g.carbs !== null ? Math.round(per100g.carbs * factor) : 0,
  };
}

type FoodLookupHit = {
  product_name?: string;
  brands?: string | string[];
  image_front_small_url?: string;
  nutriments?: Record<string, number | undefined>;
};

type FoodLookupResult = {
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, number | undefined>;
};

function normalizeFoodHit(hit: FoodLookupHit): FoodLookupResult {
  return {
    product_name: hit.product_name,
    brands: Array.isArray(hit.brands) ? hit.brands.join(", ") : hit.brands,
    image_front_small_url: hit.image_front_small_url,
    nutriments: hit.nutriments,
  };
}

function roundNutrient(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return null;
  return Math.round(value);
}

function PageTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3 text-lime-200">
          <Icon size={22} />
          <span className="text-sm font-bold uppercase tracking-[0.16em]">Анжелика</span>
        </div>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({
  children,
  right,
  subtitle,
  title,
}: {
  children: ReactNode;
  right?: string;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section className="grid min-w-0 max-w-full gap-4">
      {(title || right) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title && <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
          </div>
          {right && <span className="shrink-0 text-xs text-stone-500">{right}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[28px] bg-white/[0.03] p-4 sm:p-5", className)}>{children}</div>;
}

function Panel({
  children,
  icon: Icon,
  right,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  right?: string;
  title: string;
}) {
  return (
    <section className="min-w-0 max-w-full rounded-[32px] border border-white/10 bg-[#10120d]/82 p-4 shadow-xl shadow-black/20 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 text-lime-200">
            <Icon size={19} />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
        </div>
        {right && <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-stone-300">{right}</span>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-400">{sub}</p>
    </div>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  sub,
  value,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.07] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black/30 text-lime-200">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
        <p className="mt-1 break-words text-base font-semibold text-white">{value}</p>
        {sub ? <p className="mt-1 text-xs leading-5 text-stone-400">{sub}</p> : null}
      </div>
    </div>
  );
}

function ProgressRing({ label, percent }: { label: string; percent: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (percent / 100);
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#bef264"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-bold text-white sm:text-3xl">{percent}%</p>
          <p className="text-xs text-stone-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function MiniChart({
  compact = false,
  fields,
  measurements,
}: {
  compact?: boolean;
  fields: Array<"weight" | "waist" | "belly" | "hips">;
  measurements: Measurement[];
}) {
  const colors: Record<string, string> = {
    weight: "#bef264",
    waist: "#ff6f61",
    belly: "#f8c14a",
    hips: "#9ddcff",
  };
  const labels: Record<string, string> = {
    weight: "Вес",
    waist: "Талия",
    belly: "Живот",
    hips: "Бёдра",
  };
  const series = fields.map((field) => ({
    field,
    values: measurements
      .map((item) => ({ week: item.week, value: Number(String(item[field]).replace(",", ".")) }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0),
  }));
  const allValues = series.flatMap((item) => item.values.map((value) => value.value));
  const min = allValues.length ? Math.min(...allValues) - 1 : 0;
  const max = allValues.length ? Math.max(...allValues) + 1 : 100;
  const width = 640;
  const height = compact ? 190 : 280;
  const pad = 28;

  function points(values: Array<{ week: number; value: number }>) {
    return values
      .map((item) => {
        const x = pad + ((item.week - 1) / 7) * (width - pad * 2);
        const y = height - pad - ((item.value - min) / Math.max(1, max - min)) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div>
      <div className="min-w-0 max-w-full overflow-hidden rounded-[26px] border border-white/10 bg-black/20 p-3">
        <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График замеров">
          {weeks.map((week) => {
            const x = pad + ((week - 1) / 7) * (width - pad * 2);
            return <line key={week} x1={x} x2={x} y1={pad} y2={height - pad} stroke="rgba(255,255,255,.06)" />;
          })}
          {[0, 1, 2].map((line) => {
            const y = pad + (line / 2) * (height - pad * 2);
            return <line key={line} x1={pad} x2={width - pad} y1={y} y2={y} stroke="rgba(255,255,255,.08)" />;
          })}
          {series.map((item) => (
            <polyline key={item.field} points={points(item.values)} fill="none" stroke={colors[item.field]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          ))}
          {series.flatMap((item) =>
            item.values.map((point) => {
              const x = pad + ((point.week - 1) / 7) * (width - pad * 2);
              const y = height - pad - ((point.value - min) / Math.max(1, max - min)) * (height - pad * 2);
              return <circle key={`${item.field}-${point.week}`} cx={x} cy={y} r="5" fill={colors[item.field]} />;
            }),
          )}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.map((field) => (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-stone-300" key={field}>
            <span className="h-2 w-2 rounded-full" style={{ background: colors[field] }} />
            {labels[field]}
          </span>
        ))}
      </div>
    </div>
  );
}

function UploadTile({
  flat = false,
  label,
  onUpload,
  week,
}: {
  flat?: boolean;
  label: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>, label: string, week: number) => void;
  week: number;
}) {
  return (
    <label
      className={cn(
        "grid cursor-pointer place-items-center p-4 text-center transition",
        flat
          ? "rounded-xl bg-white/[0.025] hover:bg-white/[0.04]"
          : "rounded-[24px] border border-dashed border-white/20 bg-white/[0.04] hover:border-lime-300/60",
      )}
    >
      <Upload className="text-lime-200" size={22} />
      <span className="mt-3 text-sm font-semibold text-white">{label}</span>
      <span className="mt-1 text-xs text-stone-500">Неделя {week}</span>
      <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event, label, week)} />
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  sub: string;
}) {
  return (
    <button
      className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.06] p-5 text-left transition hover:bg-white/[0.1]"
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-300 text-stone-950">
          <Icon size={21} />
        </span>
        <span>
          <span className="block text-base font-bold text-white">{label}</span>
          <span className="mt-1 block text-sm text-stone-500">{sub}</span>
        </span>
      </span>
      <ArrowUpRight className="text-stone-500" size={20} />
    </button>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
