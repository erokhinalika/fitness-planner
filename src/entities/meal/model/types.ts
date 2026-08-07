export type MealBlock = {
  id: string;
  title: string;
  target: string;
  options: MealOption[];
};

export type MealOption = {
  id: string;
  title: string;
  description: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  tags: string[];
};
