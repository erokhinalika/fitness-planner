import { Activity, Apple, Dumbbell, Home, Library, Ruler, Smartphone, WifiOff, X, type LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/styles";

export type TabId = "dashboard" | "plan" | "library" | "progress" | "nutrition";

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-stone-950 shadow-[0_0_28px_rgba(190,242,100,0.28)]">
        <Activity size={22} strokeWidth={2.6} />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-400">План тренировок</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">Анжелика</h1>
      </div>
    </div>
  );
}

export function DesktopNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  const items = getNavItems();
  return (
    <nav className="mt-8 grid gap-2">
      {items.map((item) => (
        <button
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
            activeTab === item.id ? "bg-white text-stone-950" : "text-stone-400 hover:bg-white/5 hover:text-white",
          )}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <item.Icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function MobileHeader({ activeTab }: { activeTab: TabId }) {
  const current = getNavItems().find((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-30 mb-5 border-b border-white/10 bg-[#080907]/88 py-3 backdrop-blur-xl lg:hidden">
      <div className="min-w-0">
        <Brand />
        {current && <p className="mt-1 truncate text-sm text-stone-500">{current.label}</p>}
      </div>
    </header>
  );
}

export function PwaStatusBar({
  isOffline,
  needRefresh,
  onRefresh,
}: {
  isOffline: boolean;
  needRefresh: boolean;
  onRefresh: () => void;
}) {
  if (!isOffline && !needRefresh) return null;

  return (
    <div className="mb-4 grid gap-2">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-stone-300">
          <WifiOff className="shrink-0 text-stone-500" size={16} />
          Офлайн — план, прогресс и загруженные GIF доступны из кэша
        </div>
      )}
      {needRefresh && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-lime-300/10 px-3 py-2 text-sm text-lime-100">
          <span>Доступна новая версия приложения</span>
          <button className="shrink-0 font-semibold text-lime-300" onClick={onRefresh} type="button">
            Обновить
          </button>
        </div>
      )}
    </div>
  );
}

export function InstallPrompt({
  canPromptInstall,
  hidden,
  iosHint,
  onDismiss,
  onInstall,
  visible,
}: {
  canPromptInstall: boolean;
  hidden?: boolean;
  iosHint: boolean;
  onDismiss: () => void;
  onInstall: () => void;
  visible: boolean;
}) {
  if (hidden || !visible || !canPromptInstall) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-30 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[min(100vw-2rem,360px)]">
      <div className="rounded-2xl bg-[#151811]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300 text-stone-950">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Установить на экран</p>
            <p className="mt-1 text-xs leading-5 text-stone-400">
              {iosHint
                ? "Safari → Поделиться → «На экран Домой». План и GIF будут доступны офлайн."
                : "Открывай план как приложение — быстрее и работает без интернета."}
            </p>
          </div>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-white/[0.06] hover:text-white"
            onClick={onDismiss}
            type="button"
            aria-label="Скрыть"
          >
            <X size={16} />
          </button>
        </div>
        {!iosHint && (
          <button
            className="mt-3 w-full rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950"
            onClick={onInstall}
            type="button"
          >
            Установить
          </button>
        )}
      </div>
    </div>
  );
}

export function BottomNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-white/10 bg-[#10120d]/92 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {getNavItems().map((item) => (
          <button
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
              activeTab === item.id ? "bg-lime-300 text-stone-950" : "text-stone-400",
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <item.Icon size={18} />
            <span className="max-w-full truncate">{item.short}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function getNavItems(): Array<{ id: TabId; label: string; short: string; Icon: LucideIcon }> {
  return [
    { id: "dashboard", label: "Главная", short: "Дом", Icon: Home },
    { id: "plan", label: "Тренировки", short: "План", Icon: Dumbbell },
    { id: "library", label: "Библиотека", short: "База", Icon: Library },
    { id: "progress", label: "Прогресс", short: "Тело", Icon: Ruler },
    { id: "nutrition", label: "Питание", short: "Еда", Icon: Apple },
  ];
}
