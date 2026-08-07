import {
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Dumbbell,
  FileUp,
  Images,
  Play,
  Salad,
  Scale,
  Smartphone,
  Bell,
} from "lucide-react";

import { exerciseById, profile, workoutWeeks, workouts, type Workout, type WorkoutId } from "@/entities";
import { WorkoutCalendar } from "@/features/calendar-log/ui/WorkoutCalendar";
import type { ExerciseContext } from "@/features/exercise-library/model/types";
import { getReminderStatusLabel, type ReminderSettings } from "@/features/reminders/model/reminders";
import type { Measurement, PlannerMeta, ProgressPhotoView } from "@/features/planner-storage/model/types";
import { addDays, getLocalDayKey } from "@/shared/lib/date";
import { cn } from "@/shared/lib/styles";
import { ActionButton, MiniChart, Panel, ProgressRing, SummaryPill } from "@/shared/ui";

const workoutDayOffsets = [0, 2, 4, 5] as const;

function getInputDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
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
  return [...measurements].reverse().find((item) => item.weight || item.waist || item.belly || item.hips);
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

export function Dashboard({
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
  onLogWorkout,
  onRemoveWorkoutLog,
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
  onLogWorkout: (date: string, workoutId: WorkoutId) => void;
  onRemoveWorkoutLog: (date: string, workoutId: WorkoutId) => void;
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
            <SummaryPill
              icon={CalendarDays}
              label="Неделя"
              value={currentWeek <= workoutWeeks.length ? `${currentWeek} из ${workoutWeeks.length}` : `${currentWeek}`}
              sub={currentWeek > workoutWeeks.length ? "продолжаем в своём темпе" : ""}
            />
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
            <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-bold text-stone-950">
              Неделя {nextWeek}
            </span>
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
                    <p className="text-xs text-stone-400">
                      {item.volume} · {item.load}
                    </p>
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
        <Panel title="Календарь" icon={CalendarDays}>
          <WorkoutCalendar onLogWorkout={onLogWorkout} onRemoveLog={onRemoveWorkoutLog} state={state} />
          <label className="mt-5 block text-sm text-stone-400">
            Дата старта плана
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              type="date"
              value={state.startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
            <span className="mt-2 block text-xs leading-5 text-stone-500">
              Влияет на прогресс по неделям и отчёт. Тренировки в календаре выше можно отмечать в любой день и в любом
              порядке.
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
