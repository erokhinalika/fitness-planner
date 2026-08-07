import { getCurrentWeek } from "@/entities";
import type { PlannerMeta, ReminderMarks } from "@/features/planner-storage/model/types";

export type ReminderSettings = PlannerMeta["reminders"];

const scheduledWorkouts = [
  { offset: 0, title: "Верх тела A", label: "верх A" },
  { offset: 2, title: "Ягодицы + задняя цепь", label: "ягодицы" },
  { offset: 4, title: "Верх тела B", label: "верх B" },
  { offset: 5, title: "Всё тело", label: "всё тело" },
];

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

function dayKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isPastScheduledTime(hours: number, minutes: number, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

function getPlanDay(startDate: string, now = new Date()) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const day = Math.floor((dayKey(now) - dayKey(start)) / (24 * 60 * 60 * 1000));
  if (day < 0) return null;
  const week = Math.floor(day / 7) + 1;
  return { week, dayInWeek: day % 7 };
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
  const planDay = getPlanDay(meta.startDate, now);
  const due: ReminderPayload[] = [];

  const workout = planDay ? scheduledWorkouts.find((item) => item.offset === planDay.dayInWeek) : undefined;
  const workoutTime = parseTime(meta.reminders.workoutTime);
  if (workout && marks.workout !== today && isPastScheduledTime(workoutTime.hours, workoutTime.minutes, now)) {
    due.push({
      markKey: "workout",
      title: `Сегодня ${workout.label}`,
      body: `${workout.title}. Неделя ${planDay?.week ?? 1}, день ${workout.offset + 1}. Открой план и начни.`,
      tag: "workout-reminder",
    });
  }

  const week = getCurrentWeek(meta.startDate);
  const measureTime = parseTime(meta.reminders.measureTime);
  if (
    planDay?.dayInWeek === 0 &&
    marks.measure !== today &&
    isPastScheduledTime(measureTime.hours, measureTime.minutes, now)
  ) {
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
