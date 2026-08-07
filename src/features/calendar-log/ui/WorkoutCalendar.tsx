import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { exerciseById, workouts, type WorkoutId } from "@/entities";
import { toDateKey } from "@/shared/lib/date";
import { cn } from "@/shared/lib/styles";
import type { PlannerMeta } from "@/features/planner-storage/model/types";

const workoutDotColor: Record<WorkoutId, string> = {
  "upper-a": "#bef264",
  glutes: "#fb7185",
  "upper-b": "#38bdf8",
  "full-body": "#facc15",
};

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildMonthGrid(monthAnchor: Date) {
  const first = startOfMonth(monthAnchor);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1)
    cells.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function WorkoutFeelPreview({ workoutId }: { workoutId: WorkoutId }) {
  const workout = workouts.find((item) => item.id === workoutId);
  if (!workout) return null;
  const previewExercises = workout.exercises
    .map((item) => exerciseById.get(item.exerciseId))
    .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise?.mediaUrl))
    .slice(0, 4);

  return (
    <div className="mt-3 rounded-2xl border border-lime-300/15 bg-lime-300/[0.05] p-3">
      <p className="text-xs font-semibold text-lime-200">{workout.completionEffect.title}: где ждать крепатуру</p>
      <p className="mt-1.5 text-xs leading-5 text-stone-300">{workout.completionEffect.summary}</p>
      {previewExercises.length > 0 && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {previewExercises.map((exercise) => (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30" key={exercise.id}>
              <img
                alt={exercise.name}
                className="aspect-square w-full object-contain"
                loading="lazy"
                src={exercise.mediaUrl}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 grid gap-1.5">
        {workout.completionEffect.bullets.map((item) => (
          <div className="flex gap-1.5 text-xs leading-5 text-stone-300" key={item}>
            <Check className="mt-0.5 shrink-0 text-lime-300" size={12} strokeWidth={2.5} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkoutCalendar({
  state,
  onLogWorkout,
  onRemoveLog,
}: {
  state: PlannerMeta;
  onLogWorkout: (date: string, workoutId: WorkoutId) => void;
  onRemoveLog: (date: string, workoutId: WorkoutId) => void;
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const todayKey = toDateKey(new Date());
  const cells = buildMonthGrid(monthAnchor);
  const pickerLogged = pickerDate ? (state.calendarLog[pickerDate] ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Предыдущий месяц"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-stone-300 transition hover:bg-white/10"
          onClick={() => setMonthAnchor((current) => addMonths(current, -1))}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold capitalize text-white">{monthFormatter.format(monthAnchor)}</p>
        <button
          aria-label="Следующий месяц"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-stone-300 transition hover:bg-white/10"
          onClick={() => setMonthAnchor((current) => addMonths(current, 1))}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-stone-500">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const dateKey = toDateKey(date);
          const logged = state.calendarLog[dateKey] ?? [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === pickerDate;
          return (
            <button
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition",
                logged.length > 0
                  ? "bg-white/[0.08] text-white"
                  : "bg-white/[0.03] text-stone-400 hover:bg-white/[0.07]",
                isToday && "ring-1 ring-lime-300/70",
                isSelected && "outline outline-2 outline-lime-300/60",
              )}
              key={dateKey}
              onClick={() => setPickerDate(isSelected ? null : dateKey)}
              type="button"
            >
              <span>{date.getDate()}</span>
              {logged.length > 0 ? (
                <span className="flex gap-0.5">
                  {logged.map((id) => (
                    <span className="h-1.5 w-1.5 rounded-full" key={id} style={{ background: workoutDotColor[id] }} />
                  ))}
                </span>
              ) : (
                <span className="h-1.5 w-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {pickerDate && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              {new Date(`${pickerDate}T00:00:00`).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                weekday: "short",
              })}
            </p>
            <button
              aria-label="Закрыть"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:text-white"
              onClick={() => setPickerDate(null)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Какую тренировку отметить в этот день? Можно любую, не обязательно по плану.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {workouts.map((workout) => {
              const done = pickerLogged.includes(workout.id);
              return (
                <button
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition",
                    done ? "bg-lime-300 text-stone-950" : "bg-black/24 text-stone-300 hover:bg-black/40",
                  )}
                  key={workout.id}
                  onClick={() => (done ? onRemoveLog(pickerDate, workout.id) : onLogWorkout(pickerDate, workout.id))}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{workout.title}</span>
                  </span>
                  {done && <Check className="shrink-0" size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          {pickerLogged.length > 0 && <WorkoutFeelPreview workoutId={pickerLogged[pickerLogged.length - 1]} />}
        </div>
      )}
    </div>
  );
}
