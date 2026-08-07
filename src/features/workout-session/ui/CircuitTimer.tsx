import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";

import { exerciseById, type Workout } from "@/entities";
import { cn } from "@/shared/lib/styles";
import { Panel } from "@/shared/ui";

import {
  createCircuitTimerWorkState,
  formatClock,
  parseWorkDuration,
  type CircuitRuntime,
} from "../model/sessionRuntime";
import { playRestEndSound, playRoundCompleteSound, playWorkoutCompleteSound } from "../model/sessionFeedback";

export function CircuitTimer({ workout }: { workout: Workout }) {
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
    setRuntime(createCircuitTimerWorkState(workout, 1, 0));
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

  const getAfterWorkState = useCallback(
    (current: CircuitRuntime): CircuitRuntime => {
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
    },
    [circuit.exerciseRestSec, circuit.roundRestSec, circuit.rounds, totalExercises],
  );

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
        return createCircuitTimerWorkState(workout, current.round, current.exerciseIndex + 1);
      }
      if (current.phase === "round-rest") {
        return createCircuitTimerWorkState(workout, current.round + 1, 0);
      }
      return current;
    });
  }

  useEffect(() => {
    if (
      runtime.paused ||
      runtime.phase === "idle" ||
      runtime.phase === "done" ||
      (runtime.phase === "work" && runtime.manualWork)
    ) {
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
            return createCircuitTimerWorkState(workout, current.round, current.exerciseIndex + 1);
          }
          if (current.phase === "round-rest") {
            return createCircuitTimerWorkState(workout, current.round + 1, 0);
          }
        }

        return { ...current, secondsLeft: current.secondsLeft - 1 };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    runtime.phase,
    runtime.paused,
    runtime.manualWork,
    runtime.round,
    runtime.exerciseIndex,
    workout,
    circuit,
    totalExercises,
    getAfterWorkState,
  ]);

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
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-[0.16em]",
            runtime.phase === "done" ? "opacity-70" : "text-lime-200",
          )}
        >
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
        {runtime.phase === "round-rest" && <p className="mt-3 text-sm leading-6 text-coral-light">Круг завершён</p>}
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
          <button
            className="col-span-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-bold text-stone-950"
            onClick={finishWork}
            type="button"
          >
            Готово
          </button>
        )}
        {(runtime.phase === "exercise-rest" || runtime.phase === "round-rest") && (
          <button
            className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
            onClick={skipRest}
            type="button"
          >
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
