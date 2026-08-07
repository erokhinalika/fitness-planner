import { exercises } from "../data/exercises";

export const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

export function getExerciseById(id: string) {
  return exerciseById.get(id);
}
