import type { LucideIcon } from "lucide-react";

export type ExerciseCategory = "Верх" | "Ягодицы" | "Кор" | "Кардио";

export type Equipment =
  "штанга" | "гантели" | "резинки" | "тканевая резинка" | "коврик" | "стул/диван" | "свой вес" | "утяжелители";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment[];
  muscles: string;
  mediaUrl?: string;
  sourceUrl: string;
  setup: string;
  technique: string[];
  quietCue: string;
  Icon: LucideIcon;
  alternatives?: string[];
};
