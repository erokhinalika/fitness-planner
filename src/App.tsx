import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  exercises,
  workouts,
  getCurrentWeek,
  getNextWorkout,
  getWorkoutProgress,
  workoutById,
  exerciseById,
  type ExerciseCategory,
  type WorkoutId,
} from "@/entities";
import {
  BottomNav,
  Brand,
  DesktopNav,
  InstallPrompt,
  MobileHeader,
  PwaStatusBar,
  type TabId,
} from "@/app/ui/AppChrome";
import { usePlannerReminders } from "@/app/model/usePlannerReminders";
import { usePwaInstall } from "@/app/model/usePwaInstall";
import {
  addPlannerPhoto,
  buildExportPayload,
  ensureMeasurementWeeks,
  getWeightLogKey,
  importPlannerPayload,
  journalExerciseIds,
  logWorkoutOnDate,
  removePlannerPhoto,
  removeWorkoutLog,
  revokePhotoUrls,
  type ExportPayload,
  type ExtraFoodItem,
  type Measurement,
  type PlannerMeta,
} from "@/features/planner-storage/model/plannerRepository";
import { usePlannerStorage } from "@/features/planner-storage/model/usePlannerStorage";
import { Dashboard } from "@/features/dashboard/ui/Dashboard";
import type { ExerciseContext } from "@/features/exercise-library/model/types";
import { ExerciseDetailSheet, ExerciseLibrary } from "@/features/exercise-library/ui/ExerciseLibrary";
import { NutritionPanel, nutrientsForGrams } from "@/features/nutrition/ui/NutritionPanel";
import { ProgressPanel } from "@/features/progress/ui/ProgressPanel";
import { ReportScreen } from "@/features/report/ui/ReportScreen";
import { TrainingPlan } from "@/features/training-plan/ui/TrainingPlan";
import { WorkoutSession, clearSavedWorkoutSession, readSavedWorkoutSession } from "@/features/workout-session";
import { toDateKey } from "@/shared/lib/date";
import { clamp } from "@/shared/lib/number";
import "./styles.css";

function prefersExerciseSheet() {
  return !window.matchMedia("(min-width: 1280px)").matches;
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
  const [workoutSession, setWorkoutSession] = useState<{ workoutId: WorkoutId; week: number } | null>(() =>
    readSavedWorkoutSession(),
  );
  const [reportOpen, setReportOpen] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);
  const {
    canInstallApp,
    dismissInstallPrompt,
    installVisible,
    iosInstallHint,
    isOffline,
    needRefresh,
    openInstallPrompt,
    refreshApp,
    runInstallApp,
  } = usePwaInstall();
  const { reminderPermission, updateReminders } = usePlannerReminders({ ready, setState, state });

  function selectLibraryExercise(id: string) {
    setActiveExerciseId(id);
    if (prefersExerciseSheet()) {
      setExerciseSheet({ exerciseId: id });
    }
  }

  const currentWeek = getCurrentWeek(state.startDate);
  const progress = getWorkoutProgress(state.completed, currentWeek);
  const next = getNextWorkout(state.completed, currentWeek);

  useEffect(() => {
    if (!ready) return;
    setState((current) => {
      const measurements = ensureMeasurementWeeks(current.measurements, currentWeek);
      return measurements === current.measurements ? current : { ...current, measurements };
    });
  }, [ready, currentWeek, setState]);
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

  function toggleWorkoutToday(workoutId: WorkoutId) {
    const dateKey = toDateKey(new Date());
    updateState((current) => {
      const doneToday = current.calendarLog[dateKey]?.includes(workoutId) ?? false;
      return doneToday ? removeWorkoutLog(current, dateKey, workoutId) : logWorkoutOnDate(current, dateKey, workoutId);
    });
  }

  function logCalendarWorkout(date: string, workoutId: WorkoutId) {
    updateState((current) => logWorkoutOnDate(current, date, workoutId));
  }

  function removeCalendarWorkout(date: string, workoutId: WorkoutId) {
    updateState((current) => removeWorkoutLog(current, date, workoutId));
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

  const todayKey = toDateKey(new Date());
  const workoutDone = state.calendarLog[todayKey]?.includes(next.workout.id) ?? false;
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
          <PwaStatusBar isOffline={isOffline} needRefresh={needRefresh} onRefresh={refreshApp} />
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
              onToggleWorkout={() => toggleWorkoutToday(next.workout.id)}
              onOpenExercise={setExerciseSheet}
              onStartDateChange={(value) => updateState((current) => ({ ...current, startDate: value }))}
              onStartWorkout={() => setWorkoutSession({ workoutId: next.workout.id, week: next.week })}
              onLogWorkout={logCalendarWorkout}
              onRemoveWorkoutLog={removeCalendarWorkout}
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
              currentWeek={currentWeek}
              state={state}
              newPlaylistTitle={newPlaylistTitle}
              newPlaylistUrl={newPlaylistUrl}
              playlists={state.playlists}
              weightLogs={state.weightLogs}
              onAddPlaylist={addPlaylist}
              onLogWorkout={logCalendarWorkout}
              onRemoveWorkoutLog={removeCalendarWorkout}
              onNewPlaylistTitle={setNewPlaylistTitle}
              onNewPlaylistUrl={setNewPlaylistUrl}
              onOpenExercise={setExerciseSheet}
              onRemovePlaylist={removePlaylist}
              onSelectWorkout={setActiveWorkoutId}
              onStartWorkout={() => setWorkoutSession({ workoutId: activeWorkoutId, week: currentWeek })}
              onToggleWorkout={() => toggleWorkoutToday(activeWorkoutId)}
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
      {exerciseSheet && (
        <ExerciseDetailSheet
          context={exerciseSheet}
          onClose={() => setExerciseSheet(null)}
          onOpenExercise={setExerciseSheet}
        />
      )}
      {workoutSession && (
        <WorkoutSession
          week={workoutSession.week}
          workout={workoutById.get(workoutSession.workoutId) ?? workouts[0]}
          onClose={() => setWorkoutSession(null)}
          onComplete={() => {
            updateState((current) =>
              logWorkoutOnDate(current, toDateKey(new Date()), workoutSession.workoutId, workoutSession.week),
            );
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

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
