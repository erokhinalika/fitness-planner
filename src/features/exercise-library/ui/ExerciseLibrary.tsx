import { useEffect } from "react";
import { ArrowUpRight, ChevronRight, Library, Search, X } from "lucide-react";

import {
  exerciseById,
  workoutById,
  ExerciseMedia,
  MuscleFocusCard,
  type Exercise,
  type ExerciseCategory,
} from "@/entities";
import { cn } from "@/shared/lib/styles";
import { PageTitle, Panel } from "@/shared/ui";

import type { ExerciseContext } from "../model/types";

const categoryFilters: Array<ExerciseCategory | "Все"> = ["Все", "Верх", "Ягодицы", "Кор", "Кардио"];

export function ExerciseLibrary({
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
                  activeExerciseId === exercise.id
                    ? "border-coral bg-coral/14"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
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

export function ExerciseDetailSheet({
  context,
  onClose,
  onOpenExercise,
}: {
  context: ExerciseContext;
  onClose: () => void;
  onOpenExercise: (context: ExerciseContext) => void;
}) {
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
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
        aria-label="Закрыть упражнение"
      />
      <section className="relative flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#10120d] shadow-2xl sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[34px]">
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-lime-200">
                {workout
                  ? `${workout.title}${context.week ? ` · неделя ${context.week}` : ""}`
                  : "Библиотека упражнений"}
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
            {exercise.alternatives && exercise.alternatives.length > 0 && (
              <div className="rounded-[24px] bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-stone-300">Альтернативы</p>
                <p className="mt-1 text-xs text-stone-500">
                  Нет нужного инвентаря или хочется разнообразия — попробуй так же:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {exercise.alternatives.map((altId) => {
                    const alt = exerciseById.get(altId);
                    if (!alt) return null;
                    return (
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-lime-200 transition hover:bg-white/10"
                        key={altId}
                        onClick={() => onOpenExercise({ exerciseId: altId })}
                        type="button"
                      >
                        <alt.Icon size={15} />
                        {alt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
