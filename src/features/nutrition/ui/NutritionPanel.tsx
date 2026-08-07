import { useEffect, useState } from "react";
import {
  Check,
  Coffee,
  Cookie,
  Moon,
  Plus,
  Salad,
  Search,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { meals, profile, shoppingItems, type MealOption } from "@/entities";
import type { ExtraFoodItem } from "@/features/planner-storage/model/types";
import { clamp } from "@/shared/lib/number";
import { cn } from "@/shared/lib/styles";
import { Card, PageTitle, Panel, Section } from "@/shared/ui";

function isMealOptionSelected(
  mealId: string,
  optionId: string,
  selectedMeals: Record<string, string>,
  defaultOptionId?: string,
) {
  return selectedMeals[mealId] === optionId || (!selectedMeals[mealId] && defaultOptionId === optionId);
}

function isOffMenuMealOption(option: MealOption) {
  return option.kcal === 0 && option.id.startsWith("no-") && option.id !== "no-snack";
}

function MealOptionRow({
  option,
  selected,
  onSelect,
  divided,
}: {
  option: MealOption;
  selected: boolean;
  onSelect: () => void;
  divided: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full px-4 py-3.5 text-left transition",
        divided && "border-t border-white/[0.06]",
        selected ? "bg-lime-300/10" : "hover:bg-white/[0.03]",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition",
            selected ? "bg-lime-300 text-stone-950" : "bg-white/[0.08] text-transparent",
          )}
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={cn("font-semibold", selected ? "text-lime-100" : "text-white")}>{option.title}</p>
            <p className="mt-1 text-sm leading-5 text-stone-400">{option.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-300">
                Б {option.protein} · Ж {option.fat} · У {option.carbs}
              </span>
              {option.tags.length > 0 && <span className="text-xs text-stone-500">{option.tags.join(" · ")}</span>}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 pt-0.5 text-sm font-semibold tabular-nums",
              selected ? "text-lime-200" : "text-stone-500",
            )}
          >
            {option.kcal} ккал
          </span>
        </div>
      </div>
    </button>
  );
}

const mealIcons: Record<string, LucideIcon> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Cookie,
};

function MacroProgressBar({
  label,
  value,
  min,
  max,
  tone = "lime",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  tone?: "lime" | "coral" | "sky";
}) {
  const percent = clamp((value / max) * 100, 0, 100);
  const inRange = value >= min && value <= max;
  const barColor =
    tone === "coral"
      ? "bg-coral"
      : tone === "sky"
        ? "bg-sky-400"
        : inRange
          ? "bg-lime-300"
          : value < min
            ? "bg-amber-400"
            : "bg-coral";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold tabular-nums text-white">
          {value}{" "}
          <span className="font-normal text-stone-500">
            / {min}–{max}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function NutritionDaySummary({
  dayHint,
  extraKcal,
  shopping,
  totals,
  useMenuToday,
}: {
  dayHint: string;
  extraKcal: number;
  shopping: Record<string, boolean>;
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  useMenuToday: boolean;
}) {
  const shoppingDone = shoppingItems.filter((item) => shopping[item]).length;
  const kcalPercent = clamp(Math.round((totals.kcal / 1775) * 100), 0, 100);
  const kcalInRange = totals.kcal >= 1700 && totals.kcal <= 1850;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#151811,#0f110d)] p-5 shadow-xl">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="relative grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200/80">Итог дня</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-white">{totals.kcal}</p>
          <p className="mt-1 text-sm text-stone-400">
            ккал · цель {profile.calories}
            {!useMenuToday && totals.kcal > 0 && <span className="text-coral-light"> · своё питание</span>}
            {useMenuToday && extraKcal > 0 && <span className="text-coral-light"> · +{extraKcal} вне меню</span>}
          </p>
          <div className="mx-auto mt-3 h-1.5 max-w-[180px] overflow-hidden rounded-full bg-white/[0.08] sm:mx-0">
            <div
              className={cn(
                "h-full rounded-full",
                kcalInRange ? "bg-lime-300" : totals.kcal < 1700 ? "bg-amber-400" : "bg-coral",
              )}
              style={{ width: `${kcalPercent}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3">
          <MacroProgressBar label="Белки, г" max={120} min={105} value={totals.protein} />
          <MacroProgressBar label="Жиры, г" max={60} min={50} tone="coral" value={totals.fat} />
          <MacroProgressBar label="Углеводы, г" max={190} min={160} tone="sky" value={totals.carbs} />
          <p className="text-sm leading-6 text-stone-400">{dayHint}</p>
          <p className="text-xs text-stone-500">
            Покупки: {shoppingDone}/{shoppingItems.length} · белок {profile.macros.split("|")[0]?.trim()}
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectedMealsOverview({
  extraFood,
  selectedMeals,
  useMenuToday,
}: {
  extraFood: ExtraFoodItem[];
  selectedMeals: Record<string, string>;
  useMenuToday: boolean;
}) {
  if (!useMenuToday && extraFood.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-stone-500">
        Добавь продукты в блоке «Вне меню» — они появятся здесь и попадут в итог.
      </p>
    );
  }

  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {useMenuToday &&
        meals.map((meal) => {
          const option = meal.options.find((item) => item.id === selectedMeals[meal.id]) ?? meal.options[0];
          const Icon = mealIcons[meal.id] ?? Salad;
          if (!option) return null;
          const offMenu = isOffMenuMealOption(option);
          return (
            <div
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col rounded-2xl border px-3 py-2.5",
                offMenu ? "border-coral/25 bg-coral/[0.06]" : "border-white/10 bg-white/[0.04]",
              )}
              key={meal.id}
            >
              <div className={cn("flex items-center gap-2", offMenu ? "text-coral-light" : "text-lime-200/90")}>
                <Icon size={14} />
                <span className="text-xs font-bold uppercase tracking-[0.12em]">{meal.title}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">
                {offMenu ? "Своё — см. ниже" : option.title}
              </p>
              <p className="mt-1 text-xs tabular-nums text-stone-500">
                {offMenu ? "добавь в «Вне меню»" : `${option.kcal} ккал · Б ${option.protein}`}
              </p>
            </div>
          );
        })}
      {extraFood.map((item) => (
        <div
          className={cn(
            "flex min-w-[148px] shrink-0 flex-col rounded-2xl border px-3 py-2.5",
            useMenuToday ? "border-coral/25 bg-coral/[0.06]" : "border-white/10 bg-white/[0.04]",
          )}
          key={item.id}
        >
          <div className={cn("flex items-center gap-2", useMenuToday ? "text-coral-light" : "text-lime-200/90")}>
            <UtensilsCrossed size={14} />
            <span className="text-xs font-bold uppercase tracking-[0.12em]">{useMenuToday ? "Вне меню" : "Съела"}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.name}</p>
          <p className="mt-1 text-xs tabular-nums text-stone-500">
            {item.kcal} ккал
            {item.per100g ? ` · ${item.grams} г` : ""}
            {item.protein > 0 ? ` · Б ${item.protein}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function NutritionModeSwitch({
  useMenuToday,
  onChange,
}: {
  useMenuToday: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <button
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            useMenuToday ? "bg-lime-300 text-stone-950" : "text-stone-400 hover:text-white",
          )}
          onClick={() => onChange(true)}
          type="button"
        >
          Ела по меню
        </button>
        <button
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
            !useMenuToday ? "bg-coral text-white" : "text-stone-400 hover:text-white",
          )}
          onClick={() => onChange(false)}
          type="button"
        >
          Своё питание
        </button>
      </div>
      {!useMenuToday && (
        <p className="text-sm text-stone-500">Меню не считается — добавляй всё съеденное через блок «Вне меню» ниже.</p>
      )}
      {useMenuToday && (
        <p className="text-sm text-stone-500">
          Выбери блюда из меню. Для приёма не из плана — отметь «Не из меню» и добавь продукты в блок «Вне меню».
        </p>
      )}
    </div>
  );
}

function MacroStat({ label, target, value }: { label: string; target: string; value: string }) {
  return (
    <div className="px-2 py-1">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-stone-600">цель {target} г</p>
    </div>
  );
}

export function NutritionPanel({
  extraFood,
  selectedMeals,
  shopping,
  useMenuToday,
  onAddExtraFood,
  onRemoveExtraFood,
  onSelectMeal,
  onSetUseMenuToday,
  onToggleShopping,
  onUpdateExtraFoodGrams,
}: {
  extraFood: ExtraFoodItem[];
  selectedMeals: Record<string, string>;
  shopping: Record<string, boolean>;
  useMenuToday: boolean;
  onAddExtraFood: (item: Omit<ExtraFoodItem, "id">) => void;
  onRemoveExtraFood: (id: string) => void;
  onSelectMeal: (mealId: string, optionId: string) => void;
  onSetUseMenuToday: (value: boolean) => void;
  onToggleShopping: (item: string) => void;
  onUpdateExtraFoodGrams: (id: string, grams: number) => void;
}) {
  const selectedOptions = meals
    .map((meal) => meal.options.find((option) => option.id === selectedMeals[meal.id]) ?? meal.options[0])
    .filter(Boolean) as MealOption[];
  const menuTotals = useMenuToday
    ? selectedOptions.reduce(
        (sum, option) => ({
          kcal: sum.kcal + option.kcal,
          protein: sum.protein + option.protein,
          fat: sum.fat + option.fat,
          carbs: sum.carbs + option.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      )
    : { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const extraTotals = extraFood.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.protein,
      fat: sum.fat + item.fat,
      carbs: sum.carbs + item.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  const totals = {
    kcal: menuTotals.kcal + extraTotals.kcal,
    protein: menuTotals.protein + extraTotals.protein,
    fat: menuTotals.fat + extraTotals.fat,
    carbs: menuTotals.carbs + extraTotals.carbs,
  };
  const dayHint = !useMenuToday
    ? totals.kcal === 0
      ? "Добавь продукты, которые съела сегодня."
      : totals.kcal < 1700
        ? "Мало калорий — добавь ещё продукты."
        : totals.kcal > 1850
          ? "Выше цели по калориям."
          : totals.protein < 105
            ? "Добавь белка: творог, яйца или мясо."
            : "В пределах цели."
    : totals.kcal < 1700
      ? extraTotals.kcal > 0
        ? "Мало калорий — проверь порции в меню или добавь ещё."
        : "Мало калорий — увеличь порцию или добавь перекус."
      : totals.kcal > 1850
        ? extraTotals.kcal > 0
          ? "Выше цели — возможно, из‑за еды вне меню."
          : "Выше цели — можно облегчить ужин."
        : totals.protein < 105
          ? "Добавь белка: творог, яйца или мясо."
          : "В пределах цели.";

  return (
    <div className="grid min-w-0 max-w-full gap-8">
      <PageTitle icon={Salad} title="Питание" subtitle={`Цель: ${profile.calories}, белок 105–120 г`} />

      <NutritionModeSwitch useMenuToday={useMenuToday} onChange={onSetUseMenuToday} />

      <NutritionDaySummary
        dayHint={dayHint}
        extraKcal={extraTotals.kcal}
        shopping={shopping}
        totals={totals}
        useMenuToday={useMenuToday}
      />

      <FoodLookup
        extraFood={extraFood}
        onAdd={onAddExtraFood}
        onRemove={onRemoveExtraFood}
        onUpdateGrams={onUpdateExtraFoodGrams}
      />

      <Section
        subtitle={useMenuToday ? "Меню на сегодня — меняется при выборе блюда" : "Только продукты, которые ты добавила"}
        title="Сводка"
      >
        <SelectedMealsOverview extraFood={extraFood} selectedMeals={selectedMeals} useMenuToday={useMenuToday} />
      </Section>

      <section className="grid min-w-0 max-w-full gap-8 xl:grid-cols-[1fr_340px] xl:gap-10">
        <Section title="Конструктор дня">
          {!useMenuToday && (
            <p className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone-500">
              Справочно — в итог дня не входит. Можно посмотреть варианты на другие дни.
            </p>
          )}
          <div className={cn(!useMenuToday && "opacity-50")}>
            {meals.map((meal, mealIndex) => {
              const MealIcon = mealIcons[meal.id] ?? Salad;
              return (
                <div className={cn(mealIndex > 0 && "mt-8 border-t border-white/[0.06] pt-8")} key={meal.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-300/12 text-lime-200">
                        <MealIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white">{meal.title}</h3>
                        <p className="mt-0.5 text-sm text-lime-200/80">{meal.target}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-stone-500">
                      {meal.options.length} варианта
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-white/[0.025] ring-1 ring-white/[0.04]">
                    {meal.options.map((option, optionIndex) => (
                      <MealOptionRow
                        divided={optionIndex > 0}
                        key={option.id}
                        option={option}
                        selected={isMealOptionSelected(meal.id, option.id, selectedMeals, meal.options[0]?.id)}
                        onSelect={() => onSelectMeal(meal.id, option.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <div className="grid gap-8">
          <div className="hidden xl:block">
            <Section title="Итог дня">
              <Card className="grid gap-4">
                <div className="rounded-[22px] bg-lime-300 p-5 text-stone-950">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] opacity-70">за день</p>
                  <p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{totals.kcal}</p>
                  <p className="mt-1 text-sm font-semibold">ккал из цели {profile.calories}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                  <MacroStat label="Белки" value={`${totals.protein} г`} target="105-120" />
                  <MacroStat label="Жиры" value={`${totals.fat} г`} target="50-60" />
                  <MacroStat label="Углеводы" value={`${totals.carbs} г`} target="160-190" />
                </div>
                <p className="text-sm leading-6 text-stone-400">{dayHint}</p>
              </Card>
            </Section>
          </div>

          <Section title="Покупки">
            <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
              {shoppingItems.map((item, index) => {
                const checked = Boolean(shopping[item]);
                return (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]",
                      index > 0 && "border-t border-white/[0.06]",
                    )}
                    key={item}
                  >
                    <input
                      className="sr-only"
                      checked={checked}
                      type="checkbox"
                      onChange={() => onToggleShopping(item)}
                    />
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full transition",
                        checked ? "bg-lime-300 text-stone-950" : "bg-white/[0.08] text-transparent",
                      )}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className={cn("text-sm", checked ? "text-stone-500 line-through" : "text-stone-200")}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>
      </section>
    </div>
  );
}

function FoodLookup({
  extraFood,
  onAdd,
  onRemove,
  onUpdateGrams,
}: {
  extraFood: ExtraFoodItem[];
  onAdd: (item: Omit<ExtraFoodItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateGrams: (id: string, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portionGrams, setPortionGrams] = useState<Record<string, string>>({});
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/food-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: trimmed,
            page_size: 6,
            langs: ["ru", "en"],
            fields: ["product_name", "brands", "nutriments", "image_front_small_url"],
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("bad response");
        const data = (await response.json()) as { hits?: FoodLookupHit[] };
        setResults((data.hits ?? []).map(normalizeFoodHit).filter((product) => product.product_name));
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setError("Поиск сейчас недоступен. Попробуй ещё раз через минуту.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function getPortionGrams(key: string) {
    const parsed = Number.parseInt(portionGrams[key] ?? "100", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
  }

  function addFromSearch(product: FoodLookupResult, index: number) {
    const grams = getPortionGrams(`${product.product_name}-${index}`);
    const per100g = {
      kcal: roundNutrient(product.nutriments?.["energy-kcal_100g"]),
      protein: roundNutrient(product.nutriments?.proteins_100g),
      fat: roundNutrient(product.nutriments?.fat_100g),
      carbs: roundNutrient(product.nutriments?.carbohydrates_100g),
    };
    const scaled = nutrientsForGrams(per100g, grams);
    onAdd({
      name: product.product_name ?? "Продукт",
      grams,
      ...scaled,
      per100g,
    });
  }

  function addManualEntry() {
    const name = manualName.trim();
    const kcal = Number.parseInt(manualKcal, 10);
    if (!name || !Number.isFinite(kcal) || kcal <= 0) return;
    onAdd({ name, grams: 0, kcal, protein: 0, fat: 0, carbs: 0 });
    setManualName("");
    setManualKcal("");
  }

  return (
    <Panel icon={Search} right="на 100 г" title="Вне меню">
      <p className="mb-4 text-sm text-stone-500">
        Съела что-то не из выбранного блюда? Найди продукт и добавь в день — калории прибавятся к итогу.
      </p>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-lime-300/60"
          placeholder="творог, овсянка, индейка..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {loading && <p className="mt-3 text-sm text-stone-500">Ищу...</p>}
      {error && <p className="mt-3 text-sm text-coral-light">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">
          Ничего не нашлось — попробуй более простое название или добавь вручную ниже.
        </p>
      )}
      {results.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white/[0.025]">
          {results.map((product, index) => {
            const key = `${product.product_name}-${index}`;
            const kcal = roundNutrient(product.nutriments?.["energy-kcal_100g"]);
            const protein = roundNutrient(product.nutriments?.proteins_100g);
            const fat = roundNutrient(product.nutriments?.fat_100g);
            const carbs = roundNutrient(product.nutriments?.carbohydrates_100g);
            const grams = getPortionGrams(key);
            const preview = nutrientsForGrams({ kcal, protein, fat, carbs }, grams);
            return (
              <div
                className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
                key={key}
              >
                {product.image_front_small_url ? (
                  <img
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    src={product.image_front_small_url}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-stone-500">
                    100г
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{product.product_name}</p>
                  <p className="truncate text-xs text-stone-500">{product.brands || "без бренда"}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {preview.kcal} ккал за {grams} г · Б {preview.protein} · Ж {preview.fat} · У {preview.carbs}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    className="w-16 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm text-white outline-none focus:border-lime-300/60"
                    inputMode="numeric"
                    min={1}
                    type="number"
                    value={portionGrams[key] ?? "100"}
                    onChange={(event) => setPortionGrams((current) => ({ ...current, [key]: event.target.value }))}
                    aria-label="Граммы"
                  />
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-stone-950 transition hover:bg-lime-200"
                    onClick={() => addFromSearch(product, index)}
                    type="button"
                    aria-label="Добавить в день"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-white/[0.025] p-4">
        <p className="text-sm font-semibold text-white">Добавить вручную</p>
        <p className="mt-1 text-xs text-stone-500">Если продукта нет в базе — укажи название и калории порции.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
            placeholder="Название"
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="w-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              inputMode="numeric"
              placeholder="ккал"
              value={manualKcal}
              onChange={(event) => setManualKcal(event.target.value)}
            />
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral text-white transition hover:bg-coral/90"
              onClick={addManualEntry}
              type="button"
              aria-label="Добавить вручную"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {extraFood.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-white">Добавлено сегодня</p>
          <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
            {extraFood.map((item, index) => (
              <div
                className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/[0.06]")}
                key={item.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {item.kcal} ккал
                    {item.protein > 0 ? ` · Б ${item.protein}` : ""}
                    {item.fat > 0 ? ` · Ж ${item.fat}` : ""}
                    {item.carbs > 0 ? ` · У ${item.carbs}` : ""}
                  </p>
                </div>
                {item.per100g ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      className="w-16 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm text-white outline-none focus:border-lime-300/60"
                      inputMode="numeric"
                      min={1}
                      type="number"
                      value={item.grams}
                      onChange={(event) => onUpdateGrams(item.id, Number.parseInt(event.target.value, 10))}
                      aria-label="Граммы"
                    />
                    <span className="text-xs text-stone-500">г</span>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500">порция</span>
                )}
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-stone-400 transition hover:bg-coral/20 hover:text-coral-light"
                  onClick={() => onRemove(item.id)}
                  type="button"
                  aria-label="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

export function nutrientsForGrams(
  per100g: { kcal: number | null; protein: number | null; fat: number | null; carbs: number | null },
  grams: number,
) {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal !== null ? Math.round(per100g.kcal * factor) : 0,
    protein: per100g.protein !== null ? Math.round(per100g.protein * factor) : 0,
    fat: per100g.fat !== null ? Math.round(per100g.fat * factor) : 0,
    carbs: per100g.carbs !== null ? Math.round(per100g.carbs * factor) : 0,
  };
}

type FoodLookupHit = {
  product_name?: string;
  brands?: string | string[];
  image_front_small_url?: string;
  nutriments?: Record<string, number | undefined>;
};

type FoodLookupResult = {
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, number | undefined>;
};

function normalizeFoodHit(hit: FoodLookupHit): FoodLookupResult {
  return {
    product_name: hit.product_name,
    brands: Array.isArray(hit.brands) ? hit.brands.join(", ") : hit.brands,
    image_front_small_url: hit.image_front_small_url,
    nutriments: hit.nutriments,
  };
}

function roundNutrient(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return null;
  return Math.round(value);
}
