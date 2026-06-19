import type { PlannerMeta, ReminderMarks } from "./storage";

export type ReminderSettings = PlannerMeta["reminders"];

const WEEKDAY_WORKOUTS: Record<number, string> = {
  1: "Верх тела A",
  3: "Ягодицы",
  5: "Верх тела B",
  6: "Всё тело",
};

const WEEKDAY_WORKOUT_LABELS: Record<number, string> = {
  1: "верх A",
  3: "ягодицы",
  5: "верх B",
  6: "всё тело",
};

export function createDefaultReminders(): ReminderSettings {
  return {
    enabled: false,
    workoutTime: "09:00",
    measureTime: "10:00",
  };
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isPastScheduledTime(hours: number, minutes: number, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

function getCurrentWeek(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = Date.now() - start.getTime();
  return Math.min(8, Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1));
}

export function getReminderPermission() {
  if (typeof Notification === "undefined") return "unsupported" as const;
  return Notification.permission;
}

export async function requestReminderPermission() {
  if (typeof Notification === "undefined") return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}

export type ReminderPayload = {
  markKey: keyof ReminderMarks;
  title: string;
  body: string;
  tag: string;
};

export function collectDueReminders(meta: PlannerMeta, now = new Date()): ReminderPayload[] {
  if (!meta.reminders?.enabled) return [];

  const marks = meta.reminderMarks ?? {};
  const today = todayKey();
  const weekday = now.getDay();
  const due: ReminderPayload[] = [];

  const workoutTitle = WEEKDAY_WORKOUTS[weekday];
  const workoutLabel = WEEKDAY_WORKOUT_LABELS[weekday];
  const workoutTime = parseTime(meta.reminders.workoutTime);
  if (workoutLabel && marks.workout !== today && isPastScheduledTime(workoutTime.hours, workoutTime.minutes, now)) {
    due.push({
      markKey: "workout",
      title: `Сегодня ${workoutLabel}`,
      body: `${workoutTitle}. Открой план и начни.`,
      tag: "workout-reminder",
    });
  }

  const week = getCurrentWeek(meta.startDate);
  const measureTime = parseTime(meta.reminders.measureTime);
  if (weekday === 1 && marks.measure !== today && isPastScheduledTime(measureTime.hours, measureTime.minutes, now)) {
    due.push({
      markKey: "measure",
      title: `Неделя ${week} — замеры`,
      body: "Запиши вес, талию и обнови фото прогресса.",
      tag: "measure-reminder",
    });
  }

  return due;
}

export function showReminder(payload: ReminderPayload) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  new Notification(payload.title, {
    body: payload.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag,
  });
  return true;
}

export async function syncRemindersToServiceWorker(meta: PlannerMeta) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "PLANNER_META", meta });
}

export function applyReminderMarks(meta: PlannerMeta, keys: Array<keyof ReminderMarks>): PlannerMeta {
  const today = todayKey();
  const reminderMarks = { ...(meta.reminderMarks ?? {}) };
  for (const key of keys) {
    reminderMarks[key] = today;
  }
  return { ...meta, reminderMarks };
}

export function runReminderCheck(meta: PlannerMeta) {
  const due = collectDueReminders(meta);
  if (!due.length) return meta;

  const shownKeys: Array<keyof ReminderMarks> = [];
  for (const payload of due) {
    if (showReminder(payload)) shownKeys.push(payload.markKey);
  }

  if (!shownKeys.length) return meta;
  const next = applyReminderMarks(meta, shownKeys);
  void syncRemindersToServiceWorker(next);
  return next;
}

export function getReminderStatusLabel(meta: PlannerMeta) {
  const permission = getReminderPermission();
  if (permission === "unsupported") return "Браузер не поддерживает уведомления.";
  if (permission === "denied") return "Уведомления заблокированы в настройках браузера.";
  if (!meta.reminders.enabled) return "Напоминания выключены.";
  if (permission === "granted") return "Напоминания включены.";
  return "Разреши уведомления, чтобы получать напоминания.";
}
