import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Gauge,
  Play,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";

import {
  exerciseById,
  getPlannedLoad,
  progression,
  workouts,
  type Playlist,
  type Workout,
  type WorkoutId,
} from "@/entities";
import { WorkoutCalendar } from "@/features/calendar-log/ui/WorkoutCalendar";
import type { ExerciseContext } from "@/features/exercise-library/model/types";
import {
  getProgressionForWeek,
  getWeightLogKey,
  journalExerciseIds,
  type PlannerMeta,
} from "@/features/planner-storage/model/plannerRepository";
import { CircuitTimer } from "@/features/workout-session";
import { toDateKey } from "@/shared/lib/date";
import { cn } from "@/shared/lib/styles";
import { PageTitle, Panel, Section } from "@/shared/ui";

export function TrainingPlan({
  activeWorkout,
  activeWorkoutId,
  currentWeek,
  state,
  newPlaylistTitle,
  newPlaylistUrl,
  playlists,
  weightLogs,
  onAddPlaylist,
  onLogWorkout,
  onRemoveWorkoutLog,
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
  currentWeek: number;
  state: PlannerMeta;
  newPlaylistTitle: string;
  newPlaylistUrl: string;
  playlists: Playlist[];
  weightLogs: Record<string, string>;
  onAddPlaylist: () => void;
  onLogWorkout: (date: string, workoutId: WorkoutId) => void;
  onRemoveWorkoutLog: (date: string, workoutId: WorkoutId) => void;
  onNewPlaylistTitle: (value: string) => void;
  onNewPlaylistUrl: (value: string) => void;
  onOpenExercise: (context: ExerciseContext) => void;
  onRemovePlaylist: (id: string) => void;
  onSelectWorkout: (id: WorkoutId) => void;
  onStartWorkout: () => void;
  onToggleWorkout: () => void;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const block = getProgressionForWeek(currentWeek);
  const activeWorkoutDone = state.calendarLog[toDateKey(new Date())]?.includes(activeWorkoutId) ?? false;
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
            onClick={onToggleWorkout}
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
          {activeWorkout.note && (
            <p className="mt-4 rounded-2xl bg-coral/15 p-4 text-sm leading-6 text-coral-light">{activeWorkout.note}</p>
          )}
        </Panel>

        <div className="grid gap-5">
          {activeWorkout.circuit && <CircuitTimer workout={activeWorkout} />}
          <Panel title="Календарь" icon={CalendarDays}>
            <WorkoutCalendar onLogWorkout={onLogWorkout} onRemoveLog={onRemoveWorkoutLog} state={state} />
          </Panel>

          <Section subtitle={`${block.focus} · цель ${block.barbell}`} title={`Веса · неделя ${currentWeek}`}>
            <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
              {journalExerciseIds.map((exerciseId, index) => {
                const exercise = exerciseById.get(exerciseId);
                if (!exercise) return null;
                const plannedLoad = getPlannedLoad(exerciseId);
                return (
                  <label
                    className={cn("block px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
                    key={exerciseId}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-center">
                      <div className="min-w-0">
                        <span className="block text-sm font-medium leading-5 text-white">{exercise.name}</span>
                        <span className="mt-1 block break-words text-xs leading-5 text-stone-500">
                          план: {plannedLoad}
                        </span>
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
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {block.intensity}. {block.cue}
              </p>
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
              className={cn("bg-[#080907] p-4", index > 0 && "border-t border-white/[0.06] md:border-t-0")}
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
