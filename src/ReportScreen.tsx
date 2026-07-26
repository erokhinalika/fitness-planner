import { ArrowLeft, Download, Printer } from "lucide-react";
import { profile, workouts } from "./data";
import {
  buildReportFilename,
  buildReportSummary,
  formatMeasurementDelta,
  formatReportDate,
  formatShortDate,
  parseMeasurementValue,
} from "./report";
import type { Measurement, PlannerMeta, ProgressPhotoView } from "./storage";

type ReportScreenProps = {
  state: PlannerMeta;
  photos: ProgressPhotoView[];
  currentWeek: number;
  progress: { total: number; done: number; percent: number };
  exerciseNames: Record<string, string>;
  onClose: () => void;
};

const chartColors = {
  weight: "#65a30d",
  waist: "#ea580c",
  belly: "#ca8a04",
  hips: "#0284c7",
} as const;

const chartLabels = {
  weight: "Вес, кг",
  waist: "Талия, см",
  belly: "Живот, см",
  hips: "Бёдра, см",
} as const;

function ReportChart({ measurements }: { measurements: Measurement[] }) {
  const fields = ["weight", "waist", "belly", "hips"] as const;
  const series = fields.map((field) => ({
    field,
    values: measurements
      .map((item) => ({ week: item.week, value: parseMeasurementValue(item[field]) ?? 0 }))
      .filter((item) => item.value > 0),
  }));
  const allValues = series.flatMap((item) => item.values.map((value) => value.value));
  const min = allValues.length ? Math.min(...allValues) - 1 : 0;
  const max = allValues.length ? Math.max(...allValues) + 1 : 100;
  const width = 680;
  const height = 220;
  const pad = 32;

  function points(values: Array<{ week: number; value: number }>) {
    return values
      .map((item) => {
        const x = pad + ((item.week - 1) / 7) * (width - pad * 2);
        const y = height - pad - ((item.value - min) / Math.max(1, max - min)) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  if (!allValues.length) {
    return <p className="text-sm text-stone-500">Пока нет данных для графика.</p>;
  }

  return (
    <div>
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График замеров">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => {
          const x = pad + ((week - 1) / 7) * (width - pad * 2);
          return <line key={week} x1={x} x2={x} y1={pad} y2={height - pad} stroke="#e7e5e4" strokeWidth="1" />;
        })}
        {[0, 1, 2].map((line) => {
          const y = pad + (line / 2) * (height - pad * 2);
          return <line key={line} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#f5f5f4" strokeWidth="1" />;
        })}
        {series.map((item) =>
          item.values.length > 0 ? (
            <polyline
              key={item.field}
              points={points(item.values)}
              fill="none"
              stroke={chartColors[item.field]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ) : null,
        )}
        {series.flatMap((item) =>
          item.values.map((point) => {
            const x = pad + ((point.week - 1) / 7) * (width - pad * 2);
            const y = height - pad - ((point.value - min) / Math.max(1, max - min)) * (height - pad * 2);
            return <circle key={`${item.field}-${point.week}`} cx={x} cy={y} r="4.5" fill={chartColors[item.field]} />;
          }),
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3">
        {fields.map((field) => (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-600" key={field}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[field] }} />
            {chartLabels[field]}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

export function ReportScreen({
  state,
  photos,
  currentWeek,
  progress,
  exerciseNames,
  onClose,
}: ReportScreenProps) {
  const summary = buildReportSummary(state, photos, currentWeek, exerciseNames);
  const latest = summary.latest;
  const latestWeight = latest ? parseMeasurementValue(latest.weight) : null;
  const latestWaist = latest ? parseMeasurementValue(latest.waist) : null;

  function savePdf() {
    const previousTitle = document.title;
    document.title = buildReportFilename(currentWeek).replace(".pdf", "");
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  return (
    <div className="report-shell fixed inset-0 z-50 overflow-y-auto bg-[#080907]">
      <div className="no-print sticky top-0 z-10 border-b border-white/10 bg-[#080907]/92 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-stone-300 transition hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft size={18} />
            Назад
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-white">PDF-отчёт</p>
            <p className="truncate text-xs text-stone-500">Неделя {currentWeek} · {formatReportDate()}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200"
            onClick={savePdf}
            type="button"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Сохранить PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 sm:pb-10">
        <div className="report-print-root overflow-hidden rounded-[28px] bg-white text-stone-900 shadow-2xl shadow-black/40">
          <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f7fee7_0%,#ffffff_42%,#fafaf9_100%)] px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">Pulse Plan · Отчёт о прогрессе</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-5xl">{profile.name}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{profile.goal}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-stone-600">
              <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-stone-200">
                Неделя {currentWeek}
                {currentWeek <= 8 ? " из 8" : ""}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-stone-200">Старт {formatShortDate(state.startDate)}</span>
              <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-stone-200">Сформирован {formatReportDate()}</span>
            </div>
          </div>

          <div className="grid gap-4 border-b border-stone-200 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4 sm:px-10">
            <StatCard label="Тренировки" value={`${progress.done}/${progress.total}`} hint={`${progress.percent}% плана выполнено`} />
            <StatCard
              label="Вес"
              value={latestWeight !== null ? `${latestWeight} кг` : "—"}
              hint={
                latestWeight !== null
                  ? formatMeasurementDelta(latestWeight, summary.baseline.weight, "кг") + " от старта"
                  : "нет замеров"
              }
            />
            <StatCard
              label="Талия"
              value={latestWaist !== null ? `${latestWaist} см` : "—"}
              hint={
                latestWaist !== null
                  ? formatMeasurementDelta(latestWaist, summary.baseline.waist, "см") + " от старта"
                  : "нет замеров"
              }
            />
            <StatCard
              label="Фаза"
              value={summary.progressionBlock.weeks}
              hint={`${summary.progressionBlock.focus} · ${summary.progressionBlock.intensity}`}
            />
          </div>

          <section className="border-b border-stone-200 px-6 py-6 sm:px-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Динамика замеров</h2>
            <p className="mt-1 text-sm text-stone-500">Вес, талия, живот и бёдра по неделям</p>
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <ReportChart measurements={state.measurements} />
            </div>
          </section>

          <section className="border-b border-stone-200 px-6 py-6 sm:px-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Таблица замеров</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.12em] text-stone-500">
                    <th className="px-3 py-2 font-semibold">Неделя</th>
                    <th className="px-3 py-2 font-semibold">Вес</th>
                    <th className="px-3 py-2 font-semibold">Талия</th>
                    <th className="px-3 py-2 font-semibold">Живот</th>
                    <th className="px-3 py-2 font-semibold">Бёдра</th>
                    <th className="px-3 py-2 font-semibold">Δ вес</th>
                    <th className="px-3 py-2 font-semibold">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.filledMeasurements.map((item) => {
                    const weight = parseMeasurementValue(item.weight);
                    return (
                      <tr className="border-b border-stone-100" key={item.week}>
                        <td className="px-3 py-2.5 font-semibold text-stone-900">{item.week}</td>
                        <td className="px-3 py-2.5 tabular-nums">{item.weight || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums">{item.waist || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums">{item.belly || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums">{item.hips || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums text-stone-600">
                          {weight !== null ? formatMeasurementDelta(weight, summary.baseline.weight, "кг") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600">{item.note || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-b border-stone-200 px-6 py-6 sm:px-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Дневник рабочих весов</h2>
            <p className="mt-1 text-sm text-stone-500">Hip thrust, RDL и тяга — по неделям</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.12em] text-stone-500">
                    <th className="px-3 py-2 font-semibold">Неделя</th>
                    {Object.values(exerciseNames).map((name) => (
                      <th className="px-3 py-2 font-semibold" key={name}>
                        {name}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">Фаза</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.weightRows.map((row) => (
                    <tr className="border-b border-stone-100" key={row.week}>
                      <td className="px-3 py-2.5 font-semibold text-stone-900">{row.week}</td>
                      {row.entries.map((entry) => (
                        <td className="px-3 py-2.5 tabular-nums" key={entry.exerciseId}>
                          {entry.value ? `${entry.value} кг` : "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-stone-600">{row.block.focus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-b border-stone-200 px-6 py-6 sm:px-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Выполнение тренировок</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summary.workoutRows.map((row) => (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4" key={row.week}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-900">Неделя {row.week}</p>
                    <span className="text-xs font-semibold text-lime-700">
                      {row.doneCount}/{workouts.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{row.block.focus}</p>
                  <div className="mt-3 grid gap-1.5">
                    {row.workouts.map((workout) => (
                      <div className="flex items-center justify-between gap-2 text-sm" key={workout.id}>
                        <span className="text-stone-700">
                          {workout.shortDay} · {workout.title}
                        </span>
                        <span className={workout.done ? "font-semibold text-lime-700" : "text-stone-400"}>
                          {workout.done ? "✓" : "○"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {summary.comparePhotos && (
            <section className="px-6 py-6 sm:px-10">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Фото прогресса</h2>
              <p className="mt-1 text-sm text-stone-500">Сравнение «до» и «после»</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[summary.comparePhotos.before, summary.comparePhotos.after].map((photo) => (
                  <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50" key={photo.id}>
                    <img className="aspect-[4/5] w-full object-cover" src={photo.src} alt={photo.label} />
                    <figcaption className="border-t border-stone-200 px-4 py-3">
                      <p className="font-semibold text-stone-900">{photo.label}</p>
                      <p className="text-sm text-stone-500">Неделя {photo.week}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <footer className="border-t border-stone-200 bg-stone-50 px-6 py-5 text-xs text-stone-500 sm:px-10">
            <p>
              Питание: {profile.calories} · {profile.macros}. Рост {profile.height} см, стартовый вес {profile.weight} кг.
            </p>
            <p className="mt-2 flex items-center gap-2">
              <Download size={14} />
              Нажми «Сохранить PDF» и выбери «Сохранить как PDF» в диалоге печати.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
