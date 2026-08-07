import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Repeat, X } from "lucide-react";

import { exerciseById, warmupSteps, ExerciseMedia, MuscleFocusCard, type Workout } from "@/entities";
import { cn } from "@/shared/lib/styles";
import {
  BETWEEN_EXERCISE_REST_SEC,
  SET_REST_SEC,
  createCircuitWorkState,
  createInitialSessionRuntime,
  formatClock,
  parseSetPlan,
  readSavedWorkoutRuntime,
  saveWorkoutSession,
  type SessionRuntime,
} from "../model/sessionRuntime";
import { playRestEndSound, playRoundCompleteSound, playWorkoutCompleteSound, vibrate } from "../model/sessionFeedback";
import { useScreenWakeLock } from "../model/useScreenWakeLock";
import { CompletionEffectPanel } from "./CompletionEffectPanel";

export { clearSavedWorkoutSession, readSavedWorkoutSession } from "../model/sessionRuntime";
export { CircuitTimer } from "./CircuitTimer";

export function WorkoutSession({
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
  const [runtime, setRuntime] = useState<SessionRuntime>(
    () => readSavedWorkoutRuntime(workout, week) ?? createInitialSessionRuntime(),
  );
  const [exerciseSwap, setExerciseSwap] = useState<Record<number, string>>({});
  const [swapPickerOpen, setSwapPickerOpen] = useState(false);

  const circuit = workout.circuit;
  const totalExercises = workout.exercises.length;
  const currentItem = workout.exercises[runtime.exerciseIndex];
  const currentExercise = currentItem ? exerciseById.get(currentItem.exerciseId) : undefined;
  const swappedExerciseId = exerciseSwap[runtime.exerciseIndex];
  const displayExercise = (swappedExerciseId ? exerciseById.get(swappedExerciseId) : undefined) ?? currentExercise;
  const setPlan = currentItem ? parseSetPlan(currentItem.volume) : { sets: 1, label: "", timedSeconds: undefined };
  const warmupStep = warmupSteps[runtime.warmupIndex];
  useScreenWakeLock(runtime.phase !== "done");

  function chooseExerciseSwap(exerciseId: string | null) {
    setExerciseSwap((current) => {
      const next = { ...current };
      if (exerciseId) next[runtime.exerciseIndex] = exerciseId;
      else delete next[runtime.exerciseIndex];
      return next;
    });
    setSwapPickerOpen(false);
  }

  useEffect(() => {
    setSwapPickerOpen(false);
  }, [runtime.exerciseIndex, runtime.phase]);

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

  const beginStrengthWork = useCallback(
    (current: SessionRuntime): SessionRuntime => {
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
    },
    [workout],
  );

  const advanceAfterStrengthTimedWork = useCallback(
    (current: SessionRuntime): SessionRuntime => {
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
    },
    [totalExercises, workout],
  );

  const getAfterCircuitWork = useCallback(
    (current: SessionRuntime): SessionRuntime => {
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
    },
    [circuit, totalExercises],
  );

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
        return {
          ...current,
          ...createCircuitWorkState(workout, current.circuitRound, current.exerciseIndex + 1),
          paused: false,
        };
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

  const closeSession = useCallback(() => {
    if (runtime.phase === "done") {
      onDiscard();
      return;
    }
    onClose();
  }, [onClose, onDiscard, runtime.phase]);

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

        if (
          current.phase === "rest" ||
          current.phase === "circuit-exercise-rest" ||
          current.phase === "circuit-round-rest"
        ) {
          if (current.restSecondsLeft <= 1) {
            if (audioRef.current) playRestEndSound(audioRef.current);
            if (current.phase === "rest") return beginStrengthWork(current);
            if (current.phase === "circuit-exercise-rest") {
              return {
                ...current,
                ...createCircuitWorkState(workout, current.circuitRound, current.exerciseIndex + 1),
                paused: false,
              };
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
  }, [
    runtime.phase,
    runtime.paused,
    runtime.manualWork,
    workout,
    advanceAfterStrengthTimedWork,
    beginStrengthWork,
    getAfterCircuitWork,
  ]);

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
      ? (warmupStep?.title ?? "Разминка")
      : runtime.phase === "rest"
        ? "Отдых между подходами"
        : runtime.phase === "circuit-exercise-rest"
          ? "Отдых между упражнениями"
          : runtime.phase === "circuit-round-rest"
            ? "Перерыв между кругами"
            : runtime.phase === "done"
              ? "Тренировка завершена"
              : (currentExercise?.name ?? workout.title);

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
                    index === runtime.warmupIndex
                      ? "text-lime-200"
                      : index < runtime.warmupIndex
                        ? "text-stone-500"
                        : "text-stone-600",
                  )}
                  key={step.id}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      index <= runtime.warmupIndex ? "bg-lime-300" : "bg-white/15",
                    )}
                  />
                  {step.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {(runtime.phase === "work" || runtime.phase === "circuit-work") &&
          currentExercise &&
          displayExercise &&
          currentItem && (
            <div className="mx-auto grid max-w-lg gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                    {displayExercise.name}
                  </h2>
                  <p className="mt-2 text-sm text-stone-400">
                    {currentItem.volume} · {currentItem.load}
                  </p>
                  {swappedExerciseId && <p className="mt-1 text-xs text-lime-300">вместо «{currentExercise.name}»</p>}
                </div>
                {currentExercise.alternatives && currentExercise.alternatives.length > 0 && (
                  <button
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-xs font-semibold text-lime-200 transition hover:bg-white/10"
                    onClick={() => setSwapPickerOpen((open) => !open)}
                    type="button"
                  >
                    <Repeat size={14} />
                    Заменить
                  </button>
                )}
              </div>

              {swapPickerOpen && currentExercise.alternatives && (
                <div className="flex flex-wrap gap-2 rounded-2xl bg-white/[0.04] p-3">
                  <button
                    className={cn(
                      "rounded-full px-3.5 py-2 text-xs font-semibold transition",
                      !swappedExerciseId
                        ? "bg-lime-300 text-stone-950"
                        : "bg-white/[0.06] text-stone-300 hover:bg-white/10",
                    )}
                    onClick={() => chooseExerciseSwap(null)}
                    type="button"
                  >
                    {currentExercise.name}
                  </button>
                  {currentExercise.alternatives.map((altId) => {
                    const alt = exerciseById.get(altId);
                    if (!alt) return null;
                    return (
                      <button
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-semibold transition",
                          swappedExerciseId === altId
                            ? "bg-lime-300 text-stone-950"
                            : "bg-white/[0.06] text-stone-300 hover:bg-white/10",
                        )}
                        key={altId}
                        onClick={() => chooseExerciseSwap(altId)}
                        type="button"
                      >
                        {alt.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {!runtime.manualWork && runtime.workSecondsLeft > 0 && (
                <p className="text-center text-7xl font-semibold tabular-nums tracking-[-0.05em] text-lime-200">
                  {formatClock(runtime.workSecondsLeft)}
                </p>
              )}
              {isCircuit && (
                <p className="text-center text-sm text-stone-500">
                  Круг {runtime.circuitRound}/{circuit?.rounds} · упражнение {runtime.exerciseIndex + 1}/
                  {totalExercises}
                </p>
              )}

              <ExerciseMedia compact={!runtime.manualWork} exercise={displayExercise} />
              <MuscleFocusCard compact exercise={displayExercise} />
              <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-6 text-stone-300">
                {currentItem.cue}
              </p>
            </div>
          )}

        {(runtime.phase === "rest" ||
          runtime.phase === "circuit-exercise-rest" ||
          runtime.phase === "circuit-round-rest") && (
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
            {runtime.phase === "rest" && displayExercise && (
              <p className="text-sm text-stone-400">
                Дальше: {displayExercise.name} · подход {runtime.setNumber}/{setPlan.sets}
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
              {runtime.warmupIndex + 1 < warmupSteps.length
                ? "Готово, дальше"
                : isCircuit
                  ? "Старт круговой"
                  : "К упражнениям"}
            </button>
          )}

          {runtime.phase === "work" && runtime.manualWork && (
            <button
              className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950"
              onClick={finishStrengthSet}
              type="button"
            >
              Подход сделан
            </button>
          )}

          {runtime.phase === "circuit-work" && runtime.manualWork && (
            <button
              className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950"
              onClick={finishCircuitWork}
              type="button"
            >
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
              <button
                className="rounded-2xl bg-lime-300 px-4 py-3.5 text-sm font-bold text-stone-950"
                onClick={onComplete}
                type="button"
              >
                Готово!
              </button>
              <button
                className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-stone-300"
                onClick={onDiscard}
                type="button"
              >
                Закрыть без отметки
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
