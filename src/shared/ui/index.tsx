import type { ChangeEvent, ReactNode } from "react";
import { ArrowUpRight, Upload, type LucideIcon } from "lucide-react";

import type { Measurement } from "@/features/planner-storage/model/types";
import { cn } from "@/shared/lib/styles";

export function PageTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-lime-300 text-stone-950">
        <Icon size={22} />
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Section({
  children,
  right,
  subtitle,
  title,
}: {
  children: ReactNode;
  right?: string;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section className="grid min-w-0 max-w-full gap-4">
      {(title || right) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title && <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
          </div>
          {right && <span className="shrink-0 text-xs text-stone-500">{right}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[28px] bg-white/[0.03] p-4 sm:p-5", className)}>{children}</div>;
}

export function Panel({
  children,
  icon: Icon,
  right,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  right?: string;
  title: string;
}) {
  return (
    <section className="min-w-0 max-w-full rounded-[32px] border border-white/10 bg-[#10120d]/82 p-4 shadow-xl shadow-black/20 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 text-lime-200">
            <Icon size={19} />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
        </div>
        {right && <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-stone-300">{right}</span>}
      </div>
      {children}
    </section>
  );
}

export function SummaryPill({
  icon: Icon,
  label,
  sub,
  value,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.07] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black/30 text-lime-200">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
        <p className="mt-1 break-words text-base font-semibold text-white">{value}</p>
        {sub ? <p className="mt-1 text-xs leading-5 text-stone-400">{sub}</p> : null}
      </div>
    </div>
  );
}

export function ProgressRing({ label, percent }: { label: string; percent: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (percent / 100);
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#bef264"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-bold text-white sm:text-3xl">{percent}%</p>
          <p className="text-xs text-stone-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function MiniChart({
  compact = false,
  fields,
  measurements,
}: {
  compact?: boolean;
  fields: Array<"weight" | "waist" | "belly" | "hips">;
  measurements: Measurement[];
}) {
  const colors: Record<string, string> = {
    weight: "#bef264",
    waist: "#ff6f61",
    belly: "#f8c14a",
    hips: "#9ddcff",
  };
  const labels: Record<string, string> = {
    weight: "Вес",
    waist: "Талия",
    belly: "Живот",
    hips: "Бёдра",
  };
  const series = fields.map((field) => ({
    field,
    values: measurements
      .map((item) => ({ week: item.week, value: Number(String(item[field]).replace(",", ".")) }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0),
  }));
  const allValues = series.flatMap((item) => item.values.map((value) => value.value));
  const min = allValues.length ? Math.min(...allValues) - 1 : 0;
  const max = allValues.length ? Math.max(...allValues) + 1 : 100;
  const width = 640;
  const height = compact ? 190 : 280;
  const pad = 28;
  const totalWeeks = Math.max(8, ...measurements.map((item) => item.week), 1);
  const span = Math.max(1, totalWeeks - 1);
  const chartWeeks = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  function points(values: Array<{ week: number; value: number }>) {
    return values
      .map((item) => {
        const x = pad + ((item.week - 1) / span) * (width - pad * 2);
        const y = height - pad - ((item.value - min) / Math.max(1, max - min)) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div>
      <div className="min-w-0 max-w-full overflow-hidden rounded-[26px] border border-white/10 bg-black/20 p-3">
        <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График замеров">
          {chartWeeks.map((week) => {
            const x = pad + ((week - 1) / span) * (width - pad * 2);
            return <line key={week} x1={x} x2={x} y1={pad} y2={height - pad} stroke="rgba(255,255,255,.06)" />;
          })}
          {[0, 1, 2].map((line) => {
            const y = pad + (line / 2) * (height - pad * 2);
            return <line key={line} x1={pad} x2={width - pad} y1={y} y2={y} stroke="rgba(255,255,255,.08)" />;
          })}
          {series.map((item) => (
            <polyline
              key={item.field}
              points={points(item.values)}
              fill="none"
              stroke={colors[item.field]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ))}
          {series.flatMap((item) =>
            item.values.map((point) => {
              const x = pad + ((point.week - 1) / span) * (width - pad * 2);
              const y = height - pad - ((point.value - min) / Math.max(1, max - min)) * (height - pad * 2);
              return <circle key={`${item.field}-${point.week}`} cx={x} cy={y} r="5" fill={colors[item.field]} />;
            }),
          )}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.map((field) => (
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-stone-300"
            key={field}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: colors[field] }} />
            {labels[field]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function UploadTile({
  flat = false,
  label,
  onUpload,
  week,
}: {
  flat?: boolean;
  label: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>, label: string, week: number) => void;
  week: number;
}) {
  return (
    <label
      className={cn(
        "grid cursor-pointer place-items-center p-4 text-center transition",
        flat
          ? "rounded-xl bg-white/[0.025] hover:bg-white/[0.04]"
          : "rounded-[24px] border border-dashed border-white/20 bg-white/[0.04] hover:border-lime-300/60",
      )}
    >
      <Upload className="text-lime-200" size={22} />
      <span className="mt-3 text-sm font-semibold text-white">{label}</span>
      <span className="mt-1 text-xs text-stone-500">Неделя {week}</span>
      <input
        className="hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => onUpload(event, label, week)}
      />
    </label>
  );
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  sub: string;
}) {
  return (
    <button
      className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.06] p-5 text-left transition hover:bg-white/[0.1]"
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-300 text-stone-950">
          <Icon size={21} />
        </span>
        <span>
          <span className="block text-base font-bold text-white">{label}</span>
          <span className="mt-1 block text-sm text-stone-500">{sub}</span>
        </span>
      </span>
      <ArrowUpRight className="text-stone-500" size={20} />
    </button>
  );
}
