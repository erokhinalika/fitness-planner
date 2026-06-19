const DB_NAME = "angelika-fitness-planner";
const META_KEY = "state";
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

const WEEKDAY_WORKOUTS = {
  1: "Верх тела A",
  3: "Ягодицы",
  5: "Верх тела B",
  6: "Всё тело",
};

const WEEKDAY_WORKOUT_LABELS = {
  1: "верх A",
  3: "ягодицы",
  5: "верх B",
  6: "всё тело",
};

let lastCheck = 0;
let cachedMeta = null;

function parseTime(value) {
  const parts = String(value || "09:00").split(":");
  return {
    hours: Number(parts[0]) || 9,
    minutes: Number(parts[1]) || 0,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isPastScheduledTime(hours, minutes) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= hours * 60 + minutes;
}

function currentWeek(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = Date.now() - start.getTime();
  return Math.min(8, Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readMetaFromDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const request = tx.objectStore("meta").get(META_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeMetaToDb(meta) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put(meta, META_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function collectDueReminders(meta) {
  if (!meta?.reminders?.enabled) return [];

  const marks = meta.reminderMarks || {};
  const today = todayKey();
  const weekday = new Date().getDay();
  const due = [];

  const workoutTitle = WEEKDAY_WORKOUTS[weekday];
  const workoutLabel = WEEKDAY_WORKOUT_LABELS[weekday];
  const workoutTime = parseTime(meta.reminders.workoutTime);
  if (workoutLabel && marks.workout !== today && isPastScheduledTime(workoutTime.hours, workoutTime.minutes)) {
    due.push({
      markKey: "workout",
      title: `Сегодня ${workoutLabel}`,
      body: `${workoutTitle}. Открой план и начни.`,
      tag: "workout-reminder",
    });
  }

  const week = currentWeek(meta.startDate);
  const measureTime = parseTime(meta.reminders.measureTime);
  if (weekday === 1 && marks.measure !== today && isPastScheduledTime(measureTime.hours, measureTime.minutes)) {
    due.push({
      markKey: "measure",
      title: `Неделя ${week} — замеры`,
      body: "Запиши вес, талию и обнови фото прогресса.",
      tag: "measure-reminder",
    });
  }

  return due;
}

async function runReminderCheck() {
  const meta = cachedMeta || (await readMetaFromDb());
  if (!meta?.reminders?.enabled) return;

  const due = collectDueReminders(meta);
  if (!due.length) return;

  const today = todayKey();
  const reminderMarks = { ...(meta.reminderMarks || {}) };
  let changed = false;

  for (const payload of due) {
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag,
    });
    reminderMarks[payload.markKey] = today;
    changed = true;
  }

  if (changed) {
    const next = { ...meta, reminderMarks };
    cachedMeta = next;
    await writeMetaToDb(next);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "PLANNER_META") {
    cachedMeta = event.data.meta;
    void runReminderCheck();
  }
  if (event.data?.type === "RUN_REMINDER_CHECK") {
    void runReminderCheck();
  }
});

self.addEventListener("fetch", () => {
  const now = Date.now();
  if (now - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = now;
  void runReminderCheck();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
