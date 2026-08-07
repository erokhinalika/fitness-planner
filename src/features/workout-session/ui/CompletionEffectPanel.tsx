import { Check } from "lucide-react";

import { exerciseById, type Exercise, type Workout } from "@/entities";

export function CompletionEffectPanel({ workout }: { workout: Workout }) {
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
              <img
                className="aspect-square w-full object-contain"
                src={exercise.mediaUrl}
                alt={exercise.name}
                loading="lazy"
              />
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

      <p className="mt-4 rounded-2xl bg-black/24 px-3 py-2.5 text-xs leading-5 text-stone-500">
        {workout.completionEffect.recovery}
      </p>
    </div>
  );
}
