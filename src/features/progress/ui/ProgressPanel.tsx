import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FileText, Ruler, Trash2 } from "lucide-react";

import { exerciseById, getPlannedLoad, workoutWeeks } from "@/entities";
import {
  getProgressionForWeek,
  getWeightLogKey,
  journalExerciseIds,
  type Measurement,
  type ProgressPhotoView,
} from "@/features/planner-storage/model/plannerRepository";
import { clamp } from "@/shared/lib/number";
import { cn } from "@/shared/lib/styles";
import { MiniChart, PageTitle, Section, UploadTile } from "@/shared/ui";

function getPreviousWeightLog(weightLogs: Record<string, string>, week: number, exerciseId: string) {
  for (let index = week - 1; index >= 1; index -= 1) {
    const value = weightLogs[getWeightLogKey(index, exerciseId)]?.trim();
    if (value) return { week: index, value };
  }
  return null;
}

function pickComparePhotos(photos: ProgressPhotoView[]) {
  const before = photos.find((photo) => photo.label === "До") ?? photos.find((photo) => photo.week === 1);
  const after = photos.find((photo) => photo.label === "После") ?? photos.find((photo) => photo.week === 8);
  if (before && after && before.id !== after.id) return { before, after };
  const sorted = [...photos].sort(
    (left, right) => left.week - right.week || left.createdAt.localeCompare(right.createdAt),
  );
  if (sorted.length >= 2) return { before: sorted[0], after: sorted[sorted.length - 1] };
  return null;
}

function PhotoCompareSlider({
  afterLabel,
  afterSrc,
  beforeLabel,
  beforeSrc,
}: {
  afterLabel: string;
  afterSrc: string;
  beforeLabel: string;
  beforeSrc: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  function updatePosition(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const next = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setPosition(next);
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      updatePosition(event.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between text-sm text-stone-400">
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
      <div
        className="relative aspect-[4/5] touch-none select-none overflow-hidden rounded-2xl bg-black/30"
        ref={trackRef}
        onPointerDown={(event) => {
          dragging.current = true;
          updatePosition(event.clientX);
        }}
      >
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={afterSrc}
          alt={afterLabel}
          draggable={false}
        />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img
            className="h-full max-w-none object-cover"
            src={beforeSrc}
            alt={beforeLabel}
            draggable={false}
            style={{ width: `${position > 0 ? (100 / position) * 100 : 100}%` }}
          />
        </div>
        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.45)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-stone-950 shadow-lg">
            ↔
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-500">Проведи по фото, чтобы сравнить «до» и «после».</p>
    </div>
  );
}

export function WeightJournal({
  currentWeek,
  weightLogs,
  onWeightLogChange,
}: {
  currentWeek: number;
  weightLogs: Record<string, string>;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const [activeWeek, setActiveWeek] = useState(currentWeek);
  const block = getProgressionForWeek(activeWeek);
  const weekList = Array.from({ length: Math.max(workoutWeeks.length, currentWeek) }, (_, index) => index + 1);

  useEffect(() => {
    setActiveWeek(currentWeek);
  }, [currentWeek]);

  return (
    <Section subtitle={`${block.focus} · штанга ${block.barbell} · ${block.intensity}`} title="Дневник весов">
      <div className="max-w-full min-w-0 overflow-x-auto pb-1">
        <div className="no-scrollbar flex w-max min-w-full gap-2">
          {weekList.map((week) => (
            <button
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                activeWeek === week ? "bg-lime-300 text-stone-950" : "bg-white/[0.06] text-stone-400",
              )}
              key={week}
              onClick={() => setActiveWeek(week)}
              type="button"
            >
              Неделя {week}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-stone-500">{block.cue}</p>
      <div className="overflow-hidden rounded-2xl bg-white/[0.025]">
        {journalExerciseIds.map((exerciseId, index) => {
          const exercise = exerciseById.get(exerciseId);
          if (!exercise) return null;
          const previous = getPreviousWeightLog(weightLogs, activeWeek, exerciseId);
          return (
            <label className={cn("block px-4 py-3", index > 0 && "border-t border-white/[0.06]")} key={exerciseId}>
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem] sm:items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{exercise.name}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-stone-500">
                    план: {getPlannedLoad(exerciseId)}
                  </p>
                  {previous && (
                    <p className="mt-1 text-xs text-lime-200/80">
                      неделя {previous.week}: {previous.value}
                    </p>
                  )}
                </div>
                <input
                  className="w-full rounded-xl bg-black/30 px-3 py-2 text-left text-sm text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40 sm:text-right"
                  inputMode="decimal"
                  placeholder="кг"
                  value={weightLogs[getWeightLogKey(activeWeek, exerciseId)] ?? ""}
                  onChange={(event) => onWeightLogChange(activeWeek, exerciseId, event.target.value)}
                />
              </div>
            </label>
          );
        })}
      </div>
    </Section>
  );
}

export function ProgressPanel({
  currentWeek,
  measurements,
  photos,
  weightLogs,
  onMeasurementChange,
  onOpenReport,
  onPhotoUpload,
  onRemovePhoto,
  onWeightLogChange,
}: {
  currentWeek: number;
  measurements: Measurement[];
  photos: ProgressPhotoView[];
  weightLogs: Record<string, string>;
  onMeasurementChange: (week: number, field: keyof Omit<Measurement, "week">, value: string) => void;
  onOpenReport: () => void;
  onPhotoUpload: (event: ChangeEvent<HTMLInputElement>, label: string, week: number) => void;
  onRemovePhoto: (id: string) => void;
  onWeightLogChange: (week: number, exerciseId: string, value: string) => void;
}) {
  const compare = pickComparePhotos(photos);

  return (
    <div className="grid min-w-0 max-w-full gap-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle icon={Ruler} title="Фото и замеры" subtitle="Данные хранятся локально в IndexedDB." />
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-lime-300 px-5 py-3.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200"
          onClick={onOpenReport}
          type="button"
        >
          <FileText size={18} />
          PDF-отчёт
        </button>
      </div>

      <div className="grid gap-3 rounded-[26px] border border-lime-300/15 bg-lime-300/[0.05] p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-200">3-4 недели</p>
          <p className="mt-1 text-sm leading-6 text-stone-300">
            Первые ощущения: сон, осанка, самочувствие на тренировках.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-200">6-8 недель</p>
          <p className="mt-1 text-sm leading-6 text-stone-300">
            Заметные изменения в замерах и на фото при регулярных тренировках и питании.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-200">12+ недель</p>
          <p className="mt-1 text-sm leading-6 text-stone-300">
            Более выраженный результат — программа не ограничена 8 неделями, можно продолжать.
          </p>
        </div>
      </div>

      {compare && (
        <Section title="До / после">
          <PhotoCompareSlider
            afterLabel={`${compare.after.label} · неделя ${compare.after.week}`}
            afterSrc={compare.after.src}
            beforeLabel={`${compare.before.label} · неделя ${compare.before.week}`}
            beforeSrc={compare.before.src}
          />
        </Section>
      )}

      <WeightJournal currentWeek={currentWeek} weightLogs={weightLogs} onWeightLogChange={onWeightLogChange} />

      <section className="grid min-w-0 max-w-full gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <Section title="Графики замеров">
          <MiniChart measurements={measurements} fields={["weight", "waist", "belly", "hips"]} />
        </Section>

        <Section title="Фото-прогресс">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <UploadTile label="До" week={1} onUpload={onPhotoUpload} flat />
            <UploadTile label="После" week={8} onUpload={onPhotoUpload} flat />
            <UploadTile
              label="Еженедельно"
              week={photos[0]?.week ? Math.min(8, photos[0].week + 1) : 1}
              onUpload={onPhotoUpload}
              flat
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Можно добавить несколько фото в одну неделю или выбрать сразу несколько файлов. Сравнение «до/после» берёт
            самые подходящие снимки из галереи.
          </p>
          {photos.length > 0 ? (
            <div className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-2">
              {photos.map((photo) => (
                <div className="group relative bg-[#080907]" key={photo.id}>
                  <img className="aspect-[4/5] w-full object-cover" src={photo.src} alt={photo.label} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
                    <p className="text-sm font-semibold text-white">{photo.label}</p>
                    <p className="text-xs text-stone-300">Неделя {photo.week}</p>
                  </div>
                  <button
                    className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => void onRemovePhoto(photo.id)}
                    type="button"
                    aria-label="Удалить фото"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Пока нет фото.</p>
          )}
        </Section>
      </section>

      <MeasurementsTable measurements={measurements} onMeasurementChange={onMeasurementChange} />
    </div>
  );
}

const measurementFieldLabels: Record<"weight" | "waist" | "belly" | "hips", string> = {
  weight: "Вес, кг",
  waist: "Талия, см",
  belly: "Живот, см",
  hips: "Бёдра, см",
};

function MeasurementsTable({
  measurements,
  onMeasurementChange,
}: {
  measurements: Measurement[];
  onMeasurementChange: (week: number, field: keyof Omit<Measurement, "week">, value: string) => void;
}) {
  const inputClassName =
    "w-full min-w-0 rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40";

  return (
    <Section title="Таблица замеров">
      <div className="grid gap-3 md:hidden">
        {measurements.map((item) => (
          <div className="min-w-0 rounded-2xl bg-white/[0.04] p-4" key={item.week}>
            <p className="text-sm font-semibold text-lime-200">Неделя {item.week}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["weight", "waist", "belly", "hips"] as const).map((field) => (
                <label className="min-w-0 text-xs text-stone-500" key={field}>
                  {measurementFieldLabels[field]}
                  <input
                    className={cn(inputClassName, "mt-1.5")}
                    inputMode="decimal"
                    value={item[field]}
                    onChange={(event) => onMeasurementChange(item.week, field, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block min-w-0 text-xs text-stone-500">
              Комментарий
              <input
                className={cn(inputClassName, "mt-1.5")}
                value={item.note}
                onChange={(event) => onMeasurementChange(item.week, "note", event.target.value)}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
        <table className="min-w-[640px] w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-3 py-2">Неделя</th>
              <th className="px-3 py-2">Вес</th>
              <th className="px-3 py-2">Талия</th>
              <th className="px-3 py-2">Живот</th>
              <th className="px-3 py-2">Бёдра</th>
              <th className="px-3 py-2">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((item) => (
              <tr className="rounded-2xl bg-white/[0.04]" key={item.week}>
                <td className="rounded-l-2xl px-3 py-2 font-semibold text-white">{item.week}</td>
                {(["weight", "waist", "belly", "hips"] as const).map((field) => (
                  <td className="px-2 py-2" key={field}>
                    <input
                      className="w-24 max-w-full rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40"
                      inputMode="decimal"
                      value={item[field]}
                      onChange={(event) => onMeasurementChange(item.week, field, event.target.value)}
                    />
                  </td>
                ))}
                <td className="rounded-r-2xl px-2 py-2">
                  <input
                    className="w-full min-w-[12rem] rounded-xl bg-black/25 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-lime-300/40"
                    value={item.note}
                    onChange={(event) => onMeasurementChange(item.week, "note", event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
