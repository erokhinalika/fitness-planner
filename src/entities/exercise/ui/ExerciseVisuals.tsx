import { useEffect, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";

import type { Exercise } from "@/entities";
import { cn } from "@/shared/lib/styles";

type MuscleZone =
  "shoulders" | "chest" | "upperBack" | "lats" | "arms" | "core" | "glutes" | "hamstrings" | "quads" | "calves";

const muscleZoneLabels: Record<MuscleZone, string> = {
  shoulders: "плечи",
  chest: "грудь",
  upperBack: "верх спины",
  lats: "широчайшие",
  arms: "руки",
  core: "кор",
  glutes: "ягодицы",
  hamstrings: "задняя поверхность бедра",
  quads: "передняя поверхность бедра",
  calves: "голени",
};

function getExerciseMuscleZones(exercise: Exercise): MuscleZone[] {
  const text = `${exercise.category} ${exercise.muscles}`.toLowerCase();
  const zones = new Set<MuscleZone>();

  if (text.includes("плеч") || text.includes("дельт") || text.includes("ротатор")) zones.add("shoulders");
  if (text.includes("груд")) zones.add("chest");
  if (text.includes("ромбовид") || text.includes("трапец") || text.includes("верх спины") || text.includes("осан"))
    zones.add("upperBack");
  if (text.includes("широчай")) zones.add("lats");
  if (text.includes("бицеп") || text.includes("трицеп") || text.includes("предплеч") || text.includes("рук"))
    zones.add("arms");
  if (text.includes("кор") || text.includes("живот") || text.includes("таз") || text.includes("поясниц"))
    zones.add("core");
  if (text.includes("ягод")) zones.add("glutes");
  if (text.includes("задняя поверхность бедра") || text.includes("бедра")) zones.add("hamstrings");
  if (text.includes("сгибатели бедра") || text.includes("ноги")) zones.add("quads");
  if (text.includes("голен") || text.includes("стоп")) zones.add("calves");

  if (zones.size === 0) {
    if (exercise.category === "Верх") zones.add("shoulders").add("arms").add("upperBack");
    if (exercise.category === "Ягодицы") zones.add("glutes").add("hamstrings");
    if (exercise.category === "Кор") zones.add("core");
    if (exercise.category === "Кардио") zones.add("shoulders").add("core").add("quads").add("calves");
  }

  return Array.from(zones);
}

export function MuscleFocusCard({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const zones = getExerciseMuscleZones(exercise);
  return (
    <div className={cn("rounded-[24px] border border-lime-300/15 bg-lime-300/[0.06] p-4", compact && "p-3")}>
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <MuscleMap zones={zones} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-lime-200">Какие мышцы должны работать</p>
          <p className={cn("mt-2 leading-6 text-stone-200", compact ? "text-sm" : "text-base")}>{exercise.muscles}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <span className="rounded-full bg-lime-300/12 px-3 py-1 text-xs font-semibold text-lime-100" key={zone}>
                {muscleZoneLabels[zone]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Основное усилие должно ощущаться в подсвеченных зонах. Если вместо них забирают шею, поясница или суставы,
            уменьши нагрузку и проверь технику.
          </p>
        </div>
      </div>
    </div>
  );
}

function MuscleMap({ zones }: { zones: MuscleZone[] }) {
  const active = new Set(zones);
  const fill = (zone: MuscleZone) => (active.has(zone) ? "#bef264" : "#30342b");
  const softFill = (zone: MuscleZone) => (active.has(zone) ? "#fb7185" : "#242820");

  return (
    <div className="mx-auto grid w-full max-w-[160px] gap-2">
      <svg className="h-auto w-full" viewBox="0 0 160 210" role="img" aria-label="Схема рабочих мышц">
        <rect width="160" height="210" rx="22" fill="#11140f" />
        <text x="40" y="22" fill="#a8a29e" fontSize="10" textAnchor="middle">
          спереди
        </text>
        <text x="120" y="22" fill="#a8a29e" fontSize="10" textAnchor="middle">
          сзади
        </text>

        <circle cx="40" cy="39" r="10" fill="#4b5244" />
        <path d="M24 58 Q40 48 56 58 L52 112 Q40 123 28 112 Z" fill={fill("core")} stroke="#1f241d" strokeWidth="2" />
        <path d="M25 58 Q18 66 15 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M55 58 Q62 66 65 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M15 82 L12 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M65 82 L68 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M29 67 Q40 61 51 67 L49 86 Q40 93 31 86 Z" fill={fill("chest")} opacity="0.95" />
        <path d="M31 114 L25 166" stroke={fill("quads")} strokeWidth="12" strokeLinecap="round" />
        <path d="M49 114 L55 166" stroke={fill("quads")} strokeWidth="12" strokeLinecap="round" />
        <path d="M25 166 L23 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
        <path d="M55 166 L57 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />

        <circle cx="120" cy="39" r="10" fill="#4b5244" />
        <path
          d="M104 58 Q120 48 136 58 L132 112 Q120 123 108 112 Z"
          fill={fill("upperBack")}
          stroke="#1f241d"
          strokeWidth="2"
        />
        <path d="M109 72 Q120 62 131 72 L128 98 Q120 108 112 98 Z" fill={fill("lats")} opacity="0.96" />
        <path d="M105 58 Q98 66 95 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M135 58 Q142 66 145 82" stroke={fill("shoulders")} strokeWidth="8" strokeLinecap="round" />
        <path d="M95 82 L92 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M145 82 L148 116" stroke={fill("arms")} strokeWidth="8" strokeLinecap="round" />
        <path d="M109 111 Q120 121 131 111 L129 130 Q120 137 111 130 Z" fill={softFill("glutes")} />
        <path d="M111 132 L105 166" stroke={fill("hamstrings")} strokeWidth="12" strokeLinecap="round" />
        <path d="M129 132 L135 166" stroke={fill("hamstrings")} strokeWidth="12" strokeLinecap="round" />
        <path d="M105 166 L103 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
        <path d="M135 166 L137 193" stroke={fill("calves")} strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-stone-500">
        <span className="h-2 w-2 rounded-full bg-lime-300" />
        рабочая зона
      </div>
    </div>
  );
}

export function ExerciseMedia({ exercise, compact }: { exercise: Exercise; compact?: boolean }) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [mediaState, setMediaState] = useState<"loading" | "loaded" | "failed">(
    exercise.mediaUrl ? "loading" : "failed",
  );
  const maxHeight = compact ? "max-h-[26vh]" : "max-h-[min(72vh,420px)]";

  useEffect(() => {
    if (!exercise.mediaUrl) {
      setMediaState("failed");
      return;
    }

    const image = imageRef.current;
    if (image?.complete) {
      setMediaState(image.naturalWidth > 0 ? "loaded" : "failed");
      return;
    }

    setMediaState("loading");
  }, [exercise.id, exercise.mediaUrl]);

  if (!exercise.mediaUrl || mediaState === "failed") {
    return (
      <div
        className={cn(
          "grid aspect-square w-full place-items-center rounded-[30px] border border-white/10 bg-[#141711] p-6 text-center",
          maxHeight,
        )}
      >
        <Dumbbell className="text-stone-600" size={36} />
        <p className="mt-3 text-sm text-stone-500">Анимация недоступна</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#141711]",
        maxHeight,
      )}
    >
      <img
        className={cn("h-full w-full object-contain object-center", mediaState === "loading" && "opacity-0")}
        ref={imageRef}
        src={exercise.mediaUrl}
        alt={exercise.name}
        onLoad={() => setMediaState("loaded")}
        onError={() => setMediaState("failed")}
        loading="lazy"
      />
      {mediaState === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-lime-300" />
        </div>
      )}
    </div>
  );
}
